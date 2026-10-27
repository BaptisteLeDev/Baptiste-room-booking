import { Injectable } from '@nestjs/common';
import {
  Reservation,
  type ReservationSnapshot,
} from '../domain/reservation.js';
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
}
