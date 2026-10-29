export interface IPaymentGateway {
  processPayment(
    reservationId: string,
    amount: number,
  ): Promise<{ success: boolean; transactionId: string }>;
}

export const PAYMENT_GATEWAY = 'IPaymentGateway';
