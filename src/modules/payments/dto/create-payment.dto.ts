import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import type { PaymentCreateRequest } from '../../../contract.js';

const PAYMENT_METHODS = [
  'CARD',
  'PAYPAL',
] as const satisfies readonly PaymentCreateRequest['paymentMethod'][];

export class CreatePaymentDto implements PaymentCreateRequest {
  @IsNotEmpty()
  @IsUUID()
  reservationId: string;

  @IsNotEmpty()
  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentCreateRequest['paymentMethod'];
}
