import type { Payment as PaymentDto } from '../../../contract.js';
import type { Payment } from '../domain/entities/payment.entity.js';

export function toPaymentDto(payment: Payment): PaymentDto {
  const {
    externalTransactionId: _,
    paymentUrl,
    ...rest
  } = payment.toSnapshot();
  return { ...rest, ...(paymentUrl !== null && { paymentUrl }) };
}
