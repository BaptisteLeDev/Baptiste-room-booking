import { Injectable } from '@nestjs/common';
import type { ReservationSnapshot } from '../../domain/reservation.js';
import { ReservationAccess } from '../reservation-access.js';

@Injectable()
export class RejectReservationUseCase {
  constructor(private readonly access: ReservationAccess) {}

  execute(id: string, userId: string): Promise<ReservationSnapshot> {
    return this.access.transition(id, userId, 'manager', (r) => r.reject());
  }
}
