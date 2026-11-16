import { IsInt, IsRFC3339, IsString, MaxLength, Min } from 'class-validator';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import { MinProperties } from '../../../common/validation/min-properties.js';
import type { ReservationUpdateRequest } from '../../../contract.js';

@MinProperties(1)
export class UpdateReservationDto implements ReservationUpdateRequest {
  @ValidateIfDefined()
  @IsRFC3339()
  startAt?: string;

  @ValidateIfDefined()
  @IsRFC3339()
  endAt?: string;

  @ValidateIfDefined()
  @IsInt()
  @Min(1)
  numberOfParticipants?: number;

  @ValidateIfDefined()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
