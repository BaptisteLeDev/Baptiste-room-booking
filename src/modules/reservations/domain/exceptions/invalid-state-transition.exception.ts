import { DomainError } from '../../../../common/domain-error.js';
import { ReservationStatus } from '../enums/reservation-status.enum.js';

// Extends DomainError so the API filter maps it to 409 with the same code as before.
export class InvalidStateTransitionException extends DomainError {
  constructor(from: ReservationStatus, to: ReservationStatus) {
    super(
      'conflict',
      'RESERVATION_STATUS_CONFLICT',
      `Transition d'état invalide : impossible de passer de ${from} à ${to}.`,
    );
    this.name = 'InvalidStateTransitionException';
  }
}

export const statusConflict = () =>
  new DomainError(
    'conflict',
    'RESERVATION_STATUS_CONFLICT',
    'Statut de la réservation incompatible.',
  );

export const slotUnavailable = () =>
  new DomainError(
    'conflict',
    'SLOT_UNAVAILABLE',
    "Ce créneau n'est plus disponible.",
  );
