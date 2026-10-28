import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { IsDateOnly } from '../../../../common/validation/is-date-only.decorator.js';
import { IsStrictlyGreaterThan } from '../../../../common/validation/is-greater-or-equal-to.decorator.js';
import { IsTimeOfDay } from '../../../../common/validation/is-time-of-day.decorator.js';
import type {
  AvailabilitySlot,
  AvailabilityUpdateRequest,
} from '../../../../contract.js';

export class AvailabilitySlotDto implements AvailabilitySlot {
  @IsString()
  @IsNotEmpty()
  @IsTimeOfDay()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @IsTimeOfDay()
  @IsStrictlyGreaterThan('startTime')
  endTime: string;

  @IsBoolean()
  available: boolean;
}

export class UpdateAvailabilityDto implements AvailabilityUpdateRequest {
  @IsString()
  @IsNotEmpty()
  @IsDateOnly()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}
