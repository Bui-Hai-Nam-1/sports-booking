import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { PricingType } from '@prisma/client';

export class CreatePricingRuleDto {
  @IsEnum(PricingType)
  type!: PricingType;

  @ValidateIf((dto: CreatePricingRuleDto) => dto.type === PricingType.STANDARD)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  pricePerHour?: number;

  @ValidateIf((dto: CreatePricingRuleDto) => dto.type !== PricingType.STANDARD)
  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(20)
  increasePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday?: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startsAt!: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endsAt!: string;
}
