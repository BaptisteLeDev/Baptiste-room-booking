import {
  Payment,
  type PaymentSnapshot,
  type PaymentStatus,
} from '../domain/entities/payment.entity.js';
import { PaymentEntity } from './payment.entity.js';

export function toPayment(e: PaymentEntity): Payment {
  return Payment.restore({
    id: e.id,
    reservationId: e.reservationId,
    externalTransactionId: e.externalTransactionId,
    amount: e.amount,
    currency: e.currency,
    status: e.status as PaymentStatus,
    paymentUrl: e.paymentUrl,
    createdAt: e.createdAt.toISOString(),
  });
}

export function toEntity(s: PaymentSnapshot): PaymentEntity {
  return Object.assign(new PaymentEntity(), {
    ...s,
    createdAt: new Date(s.createdAt),
  });
}
