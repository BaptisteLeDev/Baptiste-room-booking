import { Injectable } from '@nestjs/common';
import { ReservationAccess } from '../reservation-access.js';

@Injectable()
export class CancelReservationUseCase {
  constructor(private readonly access: ReservationAccess) {}

  async execute(id: string, userId: string): Promise<void> {
    await this.access.transition(id, userId, 'party', (r) => r.cancel());
  }
}
