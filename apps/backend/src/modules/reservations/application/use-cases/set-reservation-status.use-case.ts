import { Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import { ReservationStatus } from '../../domain/enums/reservation-status.enum.js';
import { InvalidStateTransitionException } from '../../domain/exceptions/invalid-state-transition.exception.js';
import type {
  Reservation,
  ReservationSnapshot,
} from '../../domain/reservation.js';
import { ReservationAccess } from '../reservation-access.js';

// Only domain transitions: an admin cannot write a status the state machine refuses.
const APPLY: Partial<Record<ReservationStatus, (r: Reservation) => void>> = {
  [ReservationStatus.CONFIRMED]: (r) => r.confirm(),
  [ReservationStatus.REFUSED]: (r) => r.reject(),
  [ReservationStatus.CANCELLED]: (r) => r.cancel(),
  [ReservationStatus.COMPLETED]: (r) => r.complete(),
};

@Injectable()
export class SetReservationStatusUseCase {
  constructor(
    private readonly access: ReservationAccess,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    id: string,
    userId: string,
    target: ReservationStatus,
  ): Promise<ReservationSnapshot> {
    await this.authorization.assertAdmin(userId);
    return this.access.transition(id, userId, 'manager', (r) => {
      const apply = APPLY[target];
      if (!apply)
        throw new InvalidStateTransitionException(
          r.toSnapshot().status,
          target,
        );
      apply(r);
    });
  }
}
