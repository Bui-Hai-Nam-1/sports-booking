import { IsIn, IsOptional, IsString } from 'class-validator';

export class RevenueQueryDto {
  @IsOptional()
  @IsString({ message: 'from phải là chuỗi ngày ISO' })
  from?: string;

  @IsOptional()
  @IsString({ message: 'to phải là chuỗi ngày ISO' })
  to?: string;

  @IsOptional()
  @IsIn(['day', 'month'], { message: 'groupBy phải là day hoặc month' })
  groupBy?: 'day' | 'month' = 'day';

  @IsOptional()
  @IsString({ message: 'venueId phải là chuỗi' })
  venueId?: string;

  @IsOptional()
  @IsString({ message: 'courtId phải là chuỗi' })
  courtId?: string;
}
