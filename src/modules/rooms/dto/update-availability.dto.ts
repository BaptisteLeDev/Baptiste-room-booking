import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsISO8601,
  IsNotEmpty,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import type {
  AvailabilitySlot,
  AvailabilityUpdateRequest,
} from '../../../contract.js';

const TIME_OF_DAY = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilitySlotDto implements AvailabilitySlot {
  @IsString()
  @IsNotEmpty()
  @Matches(TIME_OF_DAY)
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_OF_DAY)
  endTime: string;

  @IsBoolean()
  available: boolean;
}

export class UpdateAvailabilityDto implements AvailabilityUpdateRequest {
  @IsString()
  @IsNotEmpty()
  @IsISO8601({ strict: true })
  @Matches(DATE)
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  slots: AvailabilitySlotDto[];
}
