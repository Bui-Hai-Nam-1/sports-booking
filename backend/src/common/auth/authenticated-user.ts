import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export type AppRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  role: AppRole;
}

export interface AuthenticatedRequest {
  user?: AuthenticatedUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user?.id || !request.user.role) {
      throw new UnauthorizedException('Authentication is required');
    }
    return request.user;
  },
);
