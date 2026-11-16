import { Injectable } from '@nestjs/common';
import type { ReservationSnapshot } from '../../domain/reservation.js';
import { ReservationAccess } from '../reservation-access.js';

@Injectable()
export class GetReservationUseCase {
  constructor(private readonly access: ReservationAccess) {}

  async execute(id: string, userId: string): Promise<ReservationSnapshot> {
    return (await this.access.loadFor(id, userId, 'party')).toSnapshot();
  }
}
