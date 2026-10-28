import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsDateOnly } from '../../../../common/validation/is-date-only.decorator.js';
import { IsGreaterOrEqualTo } from '../../../../common/validation/is-greater-or-equal-to.decorator.js';
import { IsTimeOfDay } from '../../../../common/validation/is-time-of-day.decorator.js';
import { ValidateIfDefined } from '../../../../common/validation/validate-if-defined.js';

export class ListRoomsQueryDto {
  @ValidateIfDefined()
  @MinLength(1)
  @MaxLength(255)
  search?: string;

  @ValidateIfDefined()
  @MinLength(1)
  @MaxLength(255)
  location?: string;

  @ValidateIfDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  capacityMin?: number;

  @ValidateIfDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @IsGreaterOrEqualTo('capacityMin')
  capacityMax?: number;

  @ValidateIfDefined()
  @IsDateOnly()
  date?: string;

  @ValidateIfDefined()
  @IsTimeOfDay()
  startTime?: string;

  @ValidateIfDefined()
  @IsTimeOfDay()
  endTime?: string;

  @ValidateIfDefined()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === 'false' ? value === 'true' : value,
  )
  @IsBoolean()
  available?: boolean;

  @ValidateIfDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ValidateIfDefined()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
