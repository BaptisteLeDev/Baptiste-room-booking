import type { Payment } from '../entities/payment.entity.js';

export interface IPaymentRepository {
  /** Throws PAYMENT_ALREADY_EXISTS when the reservation already has one. */
  save(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  existsForReservation(reservationId: string): Promise<boolean>;
}

export const PAYMENT_REPOSITORY = Symbol('IPaymentRepository');
