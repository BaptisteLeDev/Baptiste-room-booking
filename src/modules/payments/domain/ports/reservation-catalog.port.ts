export type PayableReservation = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
};

export interface ReservationCatalog {
  findPayableReservation(id: string): Promise<PayableReservation | null>;
}

export const RESERVATION_CATALOG = Symbol('ReservationCatalog');
