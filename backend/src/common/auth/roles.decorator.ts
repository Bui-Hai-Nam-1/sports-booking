import { SetMetadata } from '@nestjs/common';
import { AppRole } from './authenticated-user';

export const ROLES_KEY = 'required_roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
