import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import {
  normalizeAuthenticatedUser,
  type AuthenticatedUser,
} from './auth.types';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: unknown }>();
    const user = normalizeAuthenticatedUser(request.user);
    if (!user) {
      throw new UnauthorizedException('Authentication is required');
    }
    return user;
  },
);
