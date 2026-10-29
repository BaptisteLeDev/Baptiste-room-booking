import { Type } from 'class-transformer';
import { IsIn, IsInt, Max, Min } from 'class-validator';
import { enumValues } from '../../../common/validation/enum-values.js';
import { IsDateOnly } from '../../../common/validation/is-date-only.decorator.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { ReservationStatus } from '../../../contract.js';

const RESERVATION_STATUSES = enumValues<ReservationStatus>()([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'REFUSED',
  'CANCELLED',
  'COMPLETED',
]);

export class ListReservationsQueryDto {
  @ValidateIfDefined()
  @IsIn(RESERVATION_STATUSES)
  status?: ReservationStatus;

  @ValidateIfDefined()
  @IsDateOnly()
  from?: string;

  @ValidateIfDefined()
  @IsDateOnly()
  to?: string;

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
