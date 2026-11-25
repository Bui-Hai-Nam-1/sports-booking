import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectBookingDto {
  @IsOptional()
  @IsString({ message: 'Lý do từ chối phải là chuỗi' })
  @MaxLength(500, { message: 'Lý do từ chối tối đa 500 ký tự' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  reason?: string;
}
