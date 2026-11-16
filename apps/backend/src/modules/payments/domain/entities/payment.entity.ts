import { DomainError } from '../../../../common/domain-error.js';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export type PaymentSnapshot = {
  id: string;
  reservationId: string;
  externalTransactionId: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentUrl: string | null;
  createdAt: string;
};

const invalid = (message: string) =>
  new DomainError('invalid', 'INVALID_PAYMENT', message);

export class Payment {
  private constructor(private readonly state: PaymentSnapshot) {}

  static create(input: PaymentSnapshot): Payment {
    if (!Number.isFinite(input.amount) || input.amount < 0)
      throw invalid('Le montant doit être positif.');
    if (input.currency.length !== 3)
      throw invalid('La devise doit comporter 3 caractères.');
    return new Payment({ ...input });
  }

  static restore(state: PaymentSnapshot): Payment {
    return new Payment({ ...state });
  }

  get reservationId(): string {
    return this.state.reservationId;
  }

  toSnapshot(): PaymentSnapshot {
    return { ...this.state };
  }
}
