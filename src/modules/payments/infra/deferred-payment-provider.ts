import type {
  PaymentProvider,
  PaymentProviderResult,
} from '../domain/payment-provider.js';

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
