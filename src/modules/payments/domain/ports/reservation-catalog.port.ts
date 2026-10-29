export type PayableReservation = {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
};

export interface ReservationCatalog {
  findReservation(id: string): Promise<PayableReservation | null>;
}

export const RESERVATION_CATALOG = Symbol('ReservationCatalog');
