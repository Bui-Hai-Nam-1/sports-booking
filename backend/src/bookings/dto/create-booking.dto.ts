import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class BookingSlotInputDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;
}

export class CheckAvailabilityDto {
  @IsString()
  @MinLength(1)
  courtId!: string;

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => BookingSlotInputDto)
  slots?: BookingSlotInputDto[];
}

export class CreateBookingDto extends CheckAvailabilityDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
