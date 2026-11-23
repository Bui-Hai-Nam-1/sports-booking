import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isJwtTokenPayload,
  type AuthenticatedUser,
  type JwtTokenPayload,
} from './auth.types';

interface RequestWithAuth extends Request {
  user?: AuthenticatedUser;
}

/**
 * Verifies HS256 JWT bearer tokens compatible with the Auth module payload
 * and resolves fresh role/active status from the database when available.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly prisma?: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Authentication secret is not configured');
    }

    const payload = this.verifyHs256Jwt(token, secret);
    if (!this.prisma) {
      if (!payload.role) {
        throw new UnauthorizedException('Token role claim is missing');
      }
      request.user = {
        id: payload.sub,
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
      };
      return true;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account does not exist or is inactive');
    }

    request.user = {
      id: user.id,
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return true;
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization) {
      return null;
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }
    return token.trim();
  }

  private verifyHs256Jwt(token: string, secret: string): JwtTokenPayload {
    const segments = token.split('.');
    if (segments.length !== 3) {
      throw new UnauthorizedException('Malformed JWT token');
    }
    const [encodedHeader, encodedPayload, encodedSignature] = segments;

    let headerRaw: unknown;
    let payloadRaw: unknown;
    try {
      headerRaw = JSON.parse(Buffer.from(encodedHeader, 'base64url').toString('utf8'));
      payloadRaw = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
      throw new UnauthorizedException('Invalid JWT encoding');
    }

    if (
      typeof headerRaw !== 'object' ||
      headerRaw === null ||
      (headerRaw as { alg?: unknown }).alg !== 'HS256'
    ) {
      throw new UnauthorizedException('Unsupported JWT algorithm');
    }

    const expectedSig = createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest();
    const actualSig = Buffer.from(encodedSignature, 'base64url');

    if (
      actualSig.length !== expectedSig.length ||
      !timingSafeEqual(actualSig, expectedSig)
    ) {
      throw new UnauthorizedException('Invalid JWT signature');
    }

    if (!isJwtTokenPayload(payloadRaw)) {
      throw new UnauthorizedException('Invalid JWT payload');
    }

    if (payloadRaw.exp !== undefined && payloadRaw.exp * 1000 <= Date.now()) {
      throw new UnauthorizedException('JWT token has expired');
    }

    return payloadRaw;
  }
}
