import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { orNotFound } from '../../../../common/not-found.js';
import type { ReservationCreateRequest } from '../../../../contract.js';
import {
  Reservation,
  type ReservationSnapshot,
} from '../../domain/reservation.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../../domain/reservation-repository.js';
import { ROOM_CATALOG, type RoomCatalog } from '../../domain/room-catalog.js';
import { TimeSlot } from '../../domain/time-slot.js';
import { assertFree } from '../reservation-access.js';

const CURRENCY = 'EUR';

@Injectable()
export class CreateReservationUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly repo: ReservationRepository,
    @Inject(ROOM_CATALOG) private readonly catalog: RoomCatalog,
  ) {}

  async execute(
    userId: string,
    req: ReservationCreateRequest,
  ): Promise<ReservationSnapshot> {
    const room = orNotFound(await this.catalog.find(req.roomId));
    const slot = TimeSlot.of(req.startAt, req.endAt);
    return this.repo.exclusive(req.roomId, async (tx) => {
      await assertFree(tx, req.roomId, slot);
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
      await tx.save(r);
      return r.toSnapshot();
    });
  }
}
