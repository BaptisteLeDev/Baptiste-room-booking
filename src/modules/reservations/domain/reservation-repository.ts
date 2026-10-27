import type { Reservation } from './reservation.js';

export interface ReservationRepository {
  get(id: string): Promise<Reservation | undefined>;
  save(r: Reservation): Promise<void>;
  list(): Promise<Reservation[]>;
}

export const RESERVATION_REPOSITORY = Symbol('ReservationRepository');
