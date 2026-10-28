export type PaymentProviderResult = {
  externalTransactionId: string | null;
  paymentUrl: string | null;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
};

export interface PaymentProvider {
  initiate(
    reservationId: string,
    amount: number,
    currency: string,
    method: 'CARD' | 'PAYPAL',
  ): Promise<PaymentProviderResult>;
}

export const PAYMENT_PROVIDER = Symbol('PaymentProvider');

/**
 * No provider is configured in this repository. The boundary deliberately
 * leaves payments pending instead of fabricating an external transaction.
 */
export class DeferredPaymentProvider implements PaymentProvider {
  async initiate(): Promise<PaymentProviderResult> {
    return {
      externalTransactionId: null,
      paymentUrl: null,
      status: 'PENDING',
    };
  }
}
