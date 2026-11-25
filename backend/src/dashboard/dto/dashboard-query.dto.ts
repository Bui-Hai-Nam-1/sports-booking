import { IsOptional, IsString } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsString({ message: 'from phải là chuỗi ngày' })
  from?: string;

  @IsOptional()
  @IsString({ message: 'to phải là chuỗi ngày' })
  to?: string;

  @IsOptional()
  @IsString({ message: 'venueId phải là chuỗi' })
  venueId?: string;
}
