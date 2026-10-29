import { Inject, Injectable } from '@nestjs/common';
import { orNotFound } from '../../../../common/not-found.js';
import type { ReservationUpdateRequest } from '../../../../contract.js';
import type {
  Reservation,
  ReservationSnapshot,
  RoomTerms,
} from '../../domain/reservation.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../../domain/reservation-repository.js';
import { ROOM_CATALOG, type RoomCatalog } from '../../domain/room-catalog.js';
import { TimeSlot } from '../../domain/time-slot.js';
import { assertFree, ReservationAccess } from '../reservation-access.js';

@Injectable()
export class UpdateReservationUseCase {
  constructor(
    private readonly access: ReservationAccess,
    @Inject(RESERVATION_REPOSITORY)
    private readonly repo: ReservationRepository,
    @Inject(ROOM_CATALOG) private readonly catalog: RoomCatalog,
  ) {}

  async execute(
    id: string,
    userId: string,
    req: ReservationUpdateRequest,
  ): Promise<ReservationSnapshot> {
    const r = await this.access.loadFor(id, userId, 'client');
    const room = orNotFound(await this.catalog.find(r.roomId));
    const changesSlot = req.startAt !== undefined || req.endAt !== undefined;
    if (!changesSlot) return this.amend(this.repo, r, room, req);
    // catalog is not tx-bound: read it before the lock to keep one connection
    return this.repo.exclusive(r.roomId, async (tx) => {
      const fresh = orNotFound(await tx.get(id));
      return this.amend(tx, fresh, room, req);
    });
  }

  private async amend(
    repo: ReservationRepository,
    r: Reservation,
    room: RoomTerms,
    req: ReservationUpdateRequest,
  ): Promise<ReservationSnapshot> {
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
    if (slot) await assertFree(repo, r.roomId, slot, r.id);
    await repo.save(r);
    return r.toSnapshot();
  }
}
