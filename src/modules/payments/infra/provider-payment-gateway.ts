import { Inject, Injectable } from '@nestjs/common';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../domain/payment-provider.js';
import type { IPaymentGateway } from '../domain/ports/payment-gateway.port.js';

// IPaymentGateway carries no currency or method: fixed here until the port grows them.
const CURRENCY = 'EUR';
const METHOD = 'CARD';

@Injectable()
export class ProviderPaymentGateway implements IPaymentGateway {
  constructor(
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async processPayment(
    reservationId: string,
    amount: number,
  ): Promise<{ success: boolean; transactionId: string }> {
    const result = await this.provider.initiate(
      reservationId,
      amount,
      CURRENCY,
      METHOD,
    );
    return {
      success: result.status === 'PAID',
      transactionId: result.externalTransactionId ?? '',
    };
  }
}
