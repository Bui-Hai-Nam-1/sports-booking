import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Thiếu thông tin xác thực (token)');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Định dạng token không hợp lệ. Yêu cầu Bearer token');
    }

    try {
      // Decode standard base64/JSON token payload or signature-bearing token
      const parts = token.split('.');
      let payloadJson: string;

      if (parts.length >= 2) {
        // Standard JWT format (header.payload.signature)
        payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      } else {
        // Direct base64-encoded token for testing/demo
        payloadJson = Buffer.from(token, 'base64').toString('utf-8');
      }

      const payload = JSON.parse(payloadJson);
      if (!payload.id || !payload.role) {
        throw new Error('Invalid payload structure');
      }

      request.user = {
        id: String(payload.id),
        email: String(payload.email || ''),
        role: payload.role,
        fullName: payload.fullName || 'Người dùng',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}
