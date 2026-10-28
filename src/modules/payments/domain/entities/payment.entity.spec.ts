import { describe, expect, it } from 'vitest';
import { Payment, type PaymentSnapshot } from './payment.entity.js';

const input: PaymentSnapshot = {
  id: 'p1',
  reservationId: 'r1',
  externalTransactionId: null,
  amount: 10,
  currency: 'EUR',
  status: 'PENDING',
  paymentUrl: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('Payment', () => {
  it('rejects a negative amount', () => {
    expect(() => Payment.create({ ...input, amount: -1 })).toThrow(
      expect.objectContaining({ code: 'INVALID_PAYMENT' }),
    );
  });

  it('rejects a currency that is not 3 characters', () => {
    expect(() => Payment.create({ ...input, currency: 'EURO' })).toThrow(
      expect.objectContaining({ code: 'INVALID_PAYMENT' }),
    );
  });
});
