
import { IsBoolean } from 'class-validator';

export class UpdateUserStatusDto {
  @IsBoolean({
    message: 'Trạng thái tài khoản phải là true hoặc false',
  })
  isActive!: boolean;
}
