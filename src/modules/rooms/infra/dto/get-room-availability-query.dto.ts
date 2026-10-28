import { IsDateOnly } from '../../../../common/validation/is-date-only.decorator.js';
import { IsTimeOfDay } from '../../../../common/validation/is-time-of-day.decorator.js';
import { ValidateIfDefined } from '../../../../common/validation/validate-if-defined.js';

export class GetRoomAvailabilityQueryDto {
  @IsDateOnly()
  date: string;

  @ValidateIfDefined()
  @IsTimeOfDay()
  startTime?: string;

  @ValidateIfDefined()
  @IsTimeOfDay()
  endTime?: string;
}
