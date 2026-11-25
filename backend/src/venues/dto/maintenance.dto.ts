import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMaintenanceBlockDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  reason!: string;
}
