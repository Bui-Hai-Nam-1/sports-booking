import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @IsNotEmpty({ message: 'bookingId không được để trống' })
  @IsString({ message: 'bookingId phải là chuỗi' })
  bookingId!: string;

  @IsInt({ message: 'Đánh giá rating phải là số nguyên từ 1 đến 5' })
  @Min(1, { message: 'Đánh giá tối thiểu 1 sao' })
  @Max(5, { message: 'Đánh giá tối đa 5 sao' })
  rating!: number;

  @IsOptional()
  @IsString({ message: 'Nhận xét phải là chuỗi' })
  @MaxLength(2000, { message: 'Nhận xét tối đa 2000 ký tự' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  comment?: string;
}
