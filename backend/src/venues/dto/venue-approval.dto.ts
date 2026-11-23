import { IsEnum } from 'class-validator';
import { VenueStatus } from '@prisma/client';

export class VenueApprovalDto {
  @IsEnum(VenueStatus)
  status!: VenueStatus;
}
