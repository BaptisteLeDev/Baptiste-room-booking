import { DomainError } from '../../../common/domain-error.js';

export const paymentAlreadyExists = () =>
  new DomainError(
    'conflict',
    'PAYMENT_ALREADY_EXISTS',
    'Cette réservation possède déjà un paiement.',
  );
