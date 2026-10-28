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
