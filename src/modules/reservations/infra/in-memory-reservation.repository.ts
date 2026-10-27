import { Injectable } from '@nestjs/common';
import {
  Reservation,
  type ReservationSnapshot,
} from '../domain/reservation.js';
import type { TimeSlot } from '../domain/time-slot.js';
import type { ReservationRepository } from '../domain/reservation-repository.js';

@Injectable()
export class InMemoryReservationRepository implements ReservationRepository {
  private readonly rows = new Map<string, ReservationSnapshot>();

  async get(id: string): Promise<Reservation | undefined> {
    const s = this.rows.get(id);
    return s && Reservation.restore(s);
  }

  async save(r: Reservation): Promise<void> {
    this.rows.set(r.id, r.toSnapshot());
  }

  async list(): Promise<Reservation[]> {
    return [...this.rows.values()].map((s) => Reservation.restore(s));
  }

  async findOverlapping(
    roomId: string,
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Reservation | undefined> {
    return (await this.list()).find(
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
