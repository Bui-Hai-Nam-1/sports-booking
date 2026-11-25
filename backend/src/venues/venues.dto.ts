import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export class VenueOpeningHourDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsString()
  @Matches(timePattern)
  openTime!: string;

  @IsString()
  @Matches(timePattern)
  closeTime!: string;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;
}

export class CreateVenueDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(300)
  address!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sportTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => VenueOpeningHourDto)
  openingHours?: VenueOpeningHourDto[];
}

export class UpdateVenueDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(300)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  sportTypes?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  imageUrls?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ValidateNested({ each: true })
  @Type(() => VenueOpeningHourDto)
  openingHours?: VenueOpeningHourDto[];
}

export class CreateCourtDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(60)
  sportType!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  imageUrls?: string[];
}

export class UpdateCourtDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(60)
  sportType?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { each: true },
  )
  imageUrls?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreatePriceRuleDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @IsString()
  @Matches(timePattern)
  startTime!: string;

  @IsString()
  @Matches(timePattern)
  endTime!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000000)
  pricePerHour!: number;
}

export class UpdatePriceRuleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(80)
  name?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number | null;

  @IsOptional()
  @IsString()
  @Matches(timePattern)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(timePattern)
  endTime?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100000000)
  pricePerHour?: number;
}

export class CreateMaintenanceDto {
  @IsISO8601({ strict: true })
  startAt!: string;

  @IsISO8601({ strict: true })
  endAt!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(500)
  reason!: string;
}

export class OwnerApprovalDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'REJECTED';
}

export class SearchVenuesQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  sport?: string;
}
