import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../common/domain-error.js';
import { notFound } from '../../../common/not-found.js';
import type {
  ReservationCreateRequest,
  ReservationStatus,
  ReservationUpdateRequest,
} from '../../../contract.js';
import {
  Reservation,
  type ReservationSnapshot,
} from '../domain/reservation.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../domain/reservation-repository.js';
import { ROOM_CATALOG, type RoomCatalog } from '../domain/room-catalog.js';
import { TimeSlot } from '../domain/time-slot.js';

const CURRENCY = 'EUR';

export type ReservationListQuery = {
  status?: ReservationStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly repo: ReservationRepository,
    @Inject(ROOM_CATALOG) private readonly catalog: RoomCatalog,
  ) {}

  async createReservation(
    userId: string,
    req: ReservationCreateRequest,
  ): Promise<ReservationSnapshot> {
    const room = await this.catalog.find(req.roomId);
    if (!room) throw notFound();
    const slot = TimeSlot.of(req.startAt, req.endAt);
    await this.assertFree(req.roomId, slot);
    const r = Reservation.request({
      id: randomUUID(),
      roomId: req.roomId,
      userId,
      slot,
      numberOfParticipants: req.numberOfParticipants,
      comment: req.comment,
      room,
      currency: CURRENCY,
      now: new Date(),
    });
    await this.repo.save(r);
    return r.toSnapshot();
  }

  async getReservation(id: string): Promise<ReservationSnapshot> {
    return (await this.load(id)).toSnapshot();
  }

  async cancelReservation(id: string): Promise<void> {
    await this.transition(id, (r) => r.cancel());
  }

  async confirmReservation(id: string): Promise<ReservationSnapshot> {
    return this.transition(id, (r) => r.confirm());
  }

  async rejectReservation(id: string): Promise<ReservationSnapshot> {
    return this.transition(id, (r) => r.reject());
  }

  async updateReservation(
    id: string,
    req: ReservationUpdateRequest,
  ): Promise<ReservationSnapshot> {
    const r = await this.load(id);
    const room = await this.catalog.find(r.roomId);
    if (!room) throw notFound();
    const cur = r.toSnapshot();
    const slot =
      req.startAt !== undefined || req.endAt !== undefined
        ? TimeSlot.of(req.startAt ?? cur.startAt, req.endAt ?? cur.endAt)
        : undefined;
    r.amend(
      {
        slot,
        numberOfParticipants: req.numberOfParticipants,
        comment: req.comment,
      },
      room,
    );
    if (slot) await this.assertFree(r.roomId, slot, r.id);
    await this.repo.save(r);
    return r.toSnapshot();
  }

  async listReservations(userId: string, q: ReservationListQuery) {
    const all = (await this.repo.list())
      .map((r) => r.toSnapshot())
      .filter(
        (s) =>
          s.userId === userId &&
          (!q.status || s.status === q.status) &&
          (!q.from || s.startAt.slice(0, 10) >= q.from) &&
          (!q.to || s.startAt.slice(0, 10) <= q.to),
      );
    const start = (q.page - 1) * q.pageSize;
    return {
      items: all.slice(start, start + q.pageSize),
      page: q.page,
      pageSize: q.pageSize,
      total: all.length,
    };
  }

  private async load(id: string): Promise<Reservation> {
    const r = await this.repo.get(id);
    if (!r) throw notFound();
    return r;
  }

  private async transition(
    id: string,
    act: (r: Reservation) => void,
  ): Promise<ReservationSnapshot> {
    const r = await this.load(id);
    act(r);
    await this.repo.save(r);
    return r.toSnapshot();
  }

  private async assertFree(roomId: string, slot: TimeSlot, selfId?: string) {
    const taken = (await this.repo.list()).some(
      (o) =>
        o.roomId === roomId &&
        o.id !== selfId &&
        o.isActive &&
        o.slot.overlaps(slot),
    );
    if (taken) {
      throw new DomainError(
        'conflict',
        'SLOT_UNAVAILABLE',
        "Ce créneau n'est plus disponible.",
      );
    }
  }
}
