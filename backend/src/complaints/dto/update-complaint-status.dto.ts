import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class UpdateComplaintStatusDto {
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(ComplaintStatus, { message: 'Trạng thái không hợp lệ' })
  status!: ComplaintStatus;

  @ValidateIf((o: UpdateComplaintStatusDto) => o.status === ComplaintStatus.RESOLVED || o.status === ComplaintStatus.REJECTED)
  @IsNotEmpty({ message: 'Kết quả xử lý/lý do là bắt buộc khi đóng khiếu nại' })
  @IsString({ message: 'Kết quả xử lý phải là chuỗi' })
  @MinLength(5, { message: 'Kết quả xử lý tối thiểu 5 ký tự' })
  @MaxLength(2000, { message: 'Kết quả xử lý tối đa 2000 ký tự' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  resolution?: string;
}
