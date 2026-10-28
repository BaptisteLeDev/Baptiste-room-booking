import { Injectable } from '@nestjs/common';
import { notFound } from '../../../../common/not-found.js';
import type { ReservationUpdateRequest } from '../../../../contract.js';
import type {
  Reservation,
  ReservationSnapshot,
  RoomTerms,
} from '../../domain/reservation.js';
import type { ReservationRepository } from '../../domain/reservation-repository.js';
import { TimeSlot } from '../../domain/time-slot.js';
import { assertFree, ReservationAccess } from '../reservation-access.js';

@Injectable()
export class UpdateReservationUseCase {
  constructor(private readonly access: ReservationAccess) {}

  async execute(
    id: string,
    userId: string,
    req: ReservationUpdateRequest,
  ): Promise<ReservationSnapshot> {
    const { repo, catalog } = this.access;
    const r = await this.access.loadFor(id, userId, 'party');
    const room = await catalog.find(r.roomId);
    if (!room) throw notFound();
    const changesSlot = req.startAt !== undefined || req.endAt !== undefined;
    if (!changesSlot) return this.amend(repo, r, room, req);
    // catalog is not tx-bound: read it before the lock to keep one connection
    return repo.exclusive(r.roomId, async (tx) => {
      const fresh = await tx.get(id);
      if (!fresh) throw notFound();
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
