import { IsEnum } from 'class-validator';
import { ReservationStatus } from '../domain/enums/reservation-status.enum.js';

export class SetReservationStatusDto {
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;
}
