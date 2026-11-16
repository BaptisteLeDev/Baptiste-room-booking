import { IsIn, IsNotEmpty, IsUUID } from 'class-validator';
import { enumValues } from '../../../common/validation/enum-values.js';
import type { PaymentCreateRequest } from '../../../contract.js';

const PAYMENT_METHODS = enumValues<PaymentCreateRequest['paymentMethod']>()([
  'CARD',
  'PAYPAL',
]);

export class CreatePaymentDto implements PaymentCreateRequest {
  @IsNotEmpty()
  @IsUUID()
  reservationId: string;

  @IsNotEmpty()
  @IsIn(PAYMENT_METHODS)
  paymentMethod: PaymentCreateRequest['paymentMethod'];
}
