import { Injectable } from '@nestjs/common';
import {
  Reservation,
  type ReservationSnapshot,
} from '../../src/modules/reservations/domain/reservation.js';
import type { ReservationStatus } from '../../src/modules/reservations/domain/enums/reservation-status.enum.js';
import type { TimeSlot } from '../../src/modules/reservations/domain/time-slot.js';
import { statusConflict } from '../../src/modules/reservations/domain/exceptions/invalid-state-transition.exception.js';
import type {
  ReservationFilter,
  ReservationRepository,
} from '../../src/modules/reservations/domain/reservation-repository.js';

@Injectable()
export class InMemoryReservationRepository implements ReservationRepository {
  private readonly rows = new Map<string, ReservationSnapshot>();

  async get(id: string): Promise<Reservation | undefined> {
    const s = this.rows.get(id);
    return s && Reservation.restore(s);
  }

  async save(r: Reservation, loadedStatus?: ReservationStatus): Promise<void> {
    const stored = this.rows.get(r.id);
    if (loadedStatus !== undefined && stored?.status !== loadedStatus) {
      throw statusConflict();
    }
    this.rows.set(r.id, r.toSnapshot());
  }

  async search(
    f: ReservationFilter,
  ): Promise<{ items: Reservation[]; total: number }> {
    const matching = [...this.rows.values()].filter(
      (s) =>
        s.userId === f.userId &&
        (!f.status || s.status === f.status) &&
        (!f.from || s.startAt.slice(0, 10) >= f.from) &&
        (!f.to || s.startAt.slice(0, 10) <= f.to),
    );
    const start = (f.page - 1) * f.pageSize;
    return {
      items: matching
        .slice(start, start + f.pageSize)
        .map((s) => Reservation.restore(s)),
      total: matching.length,
    };
  }

  async findByRooms(
    roomIds: readonly string[],
    status?: ReservationStatus,
  ): Promise<Reservation[]> {
    return [...this.rows.values()]
      .filter(
        (s) => roomIds.includes(s.roomId) && (!status || s.status === status),
      )
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .map((s) => Reservation.restore(s));
  }

  async findOverlapping(
    roomId: string,
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Reservation | undefined> {
    return [...this.rows.values()]
      .map((s) => Reservation.restore(s))
      .find(
        (o) =>
          o.roomId === roomId &&
          o.id !== excludeId &&
          o.isActive &&
          o.slot.overlaps(slot),
      );
  }

  async exclusive<T>(
    _roomId: string,
    work: (tx: ReservationRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
}
