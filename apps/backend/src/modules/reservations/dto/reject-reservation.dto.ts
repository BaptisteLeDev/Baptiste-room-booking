import { IsString } from 'class-validator';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { ReservationRejectRequest } from '../../../contract.js';

export class RejectReservationDto implements ReservationRejectRequest {
  @ValidateIfDefined()
  @IsString()
  reason?: string;
}
