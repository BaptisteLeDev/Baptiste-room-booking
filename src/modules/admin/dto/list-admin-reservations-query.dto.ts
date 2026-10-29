import { Type } from 'class-transformer';
import { IsIn, IsInt, IsUUID, Max, Min } from 'class-validator';
import { MAX_PAGE } from '../../../common/database/paginate.js';
import { enumValues } from '../../../common/validation/enum-values.js';
import { ValidateIfDefined } from '../../../common/validation/validate-if-defined.js';
import type { ReservationStatus } from '../../../contract.js';

const STATUSES = enumValues<ReservationStatus>()([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'REFUSED',
  'CANCELLED',
  'COMPLETED',
]);

export class ListAdminReservationsQueryDto {
  @ValidateIfDefined()
  @IsIn(STATUSES)
  status?: ReservationStatus;

  @ValidateIfDefined()
  @IsUUID()
  roomId?: string;

  @ValidateIfDefined()
  @IsUUID()
  userId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;
}
