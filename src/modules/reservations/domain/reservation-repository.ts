import type { Reservation } from './reservation.js';
import type { TimeSlot } from './time-slot.js';

export interface ReservationRepository {
  get(id: string): Promise<Reservation | undefined>;
  save(r: Reservation): Promise<void>;
  list(): Promise<Reservation[]>;
  findOverlapping(
    roomId: string,
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Reservation | undefined>;
  exclusive<T>(
    roomId: string,
    work: (tx: ReservationRepository) => Promise<T>,
  ): Promise<T>;
}

export const RESERVATION_REPOSITORY = Symbol('ReservationRepository');
