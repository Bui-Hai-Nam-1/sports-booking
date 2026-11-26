import { Type } from "class-transformer";
import { IsInt, IsString, Matches, Max, Min } from "class-validator";

export class PricingQuoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  weekday!: number;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time!: string;
}
