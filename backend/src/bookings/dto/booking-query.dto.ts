import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BookingQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(BookingStatus, { message: 'Trạng thái booking không hợp lệ' })
  status?: BookingStatus;

  @IsOptional()
  @IsString({ message: 'courtId phải là chuỗi' })
  courtId?: string;

  @IsOptional()
  @IsString({ message: 'dateFrom phải là chuỗi ISO ngày' })
  dateFrom?: string;

  @IsOptional()
  @IsString({ message: 'dateTo phải là chuỗi ISO ngày' })
  dateTo?: string;
}
