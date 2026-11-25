import { IsEnum, IsOptional } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ComplaintQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ComplaintStatus, { message: 'Trạng thái khiếu nại không hợp lệ' })
  status?: ComplaintStatus;
}
