import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateComplaintDto {
  @IsNotEmpty({ message: 'bookingId không được để trống' })
  @IsString({ message: 'bookingId phải là chuỗi' })
  bookingId!: string;

  @IsNotEmpty({ message: 'Tiêu đề khiếu nại không được để trống' })
  @IsString({ message: 'Tiêu đề khiếu nại phải là chuỗi' })
  @MinLength(3, { message: 'Tiêu đề khiếu nại tối thiểu 3 ký tự' })
  @MaxLength(150, { message: 'Tiêu đề khiếu nại tối đa 150 ký tự' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  subject!: string;

  @IsNotEmpty({ message: 'Nội dung khiếu nại không được để trống' })
  @IsString({ message: 'Nội dung khiếu nại phải là chuỗi' })
  @MinLength(10, { message: 'Nội dung khiếu nại tối thiểu 10 ký tự' })
  @MaxLength(3000, { message: 'Nội dung khiếu nại tối đa 3000 ký tự' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  description!: string;
}
