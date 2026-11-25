
import { IsEnum } from 'class-validator';

export enum AssignableUserRole {
  CUSTOMER = 'CUSTOMER',
  OWNER = 'OWNER',
}

export class UpdateRoleDto {
  @IsEnum(AssignableUserRole, {
    message: 'Vai trò chỉ được là CUSTOMER hoặc OWNER',
  })
  role!: AssignableUserRole;
}
