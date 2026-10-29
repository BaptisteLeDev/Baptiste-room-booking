import type { ReservationStatus } from './enums/reservation-status.enum.js';
import type { Reservation } from './reservation.js';
import type { TimeSlot } from './time-slot.js';

export type ReservationFilter = {
  userId: string;
  status?: `${ReservationStatus}`;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export interface ReservationRepository {
  get(id: string): Promise<Reservation | undefined>;
  // loadedStatus set on updates: a write over a concurrent transition fails.
  save(r: Reservation, loadedStatus?: ReservationStatus): Promise<void>;
  search(
    filter: ReservationFilter,
  ): Promise<{ items: Reservation[]; total: number }>;
  findByRooms(
    roomIds: readonly string[],
    status?: ReservationStatus,
  ): Promise<Reservation[]>;
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
