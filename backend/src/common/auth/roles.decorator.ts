import { SetMetadata } from '@nestjs/common';

export type AppRole = 'CUSTOMER' | 'OWNER' | 'ADMIN';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
