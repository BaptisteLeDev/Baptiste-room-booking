import { DomainError } from '../../../common/domain-error.js';
import type { PayableReservation } from './ports/reservation-catalog.port.js';

const PAYABLE = ['PENDING_PAYMENT', 'CONFIRMED'];

export const assertPayable = (reservation: PayableReservation): void => {
  if (!PAYABLE.includes(reservation.status)) {
    throw new DomainError(
      'conflict',
      'RESERVATION_NOT_PAYABLE',
      "Cette réservation n'est plus payable.",
    );
  }
};
