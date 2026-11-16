import type { ReservationStatus } from './enums/reservation-status.enum.js';
import type { Reservation } from './reservation.js';
import type { TimeSlot } from './time-slot.js';

export interface ReservationRepository {
  get(id: string): Promise<Reservation | undefined>;
  // loadedStatus set on updates: a write over a concurrent transition fails.
  save(r: Reservation, loadedStatus?: ReservationStatus): Promise<void>;
  list(): Promise<Reservation[]>;
  findOverlapping(
    roomId: string,
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Reservation | undefined>;
  /** Open availability covers the slot and no closed range inside it. */
  isOpen(roomId: string, slot: TimeSlot): Promise<boolean>;
  exclusive<T>(
    roomId: string,
    work: (tx: ReservationRepository) => Promise<T>,
  ): Promise<T>;
}

export const RESERVATION_REPOSITORY = Symbol('ReservationRepository');
