import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { notFound } from '../../../common/not-found.js';
import { AuthorizationService } from '../../auth/application/authorization.service.js';
import type {
  Reservation,
  ReservationSnapshot,
} from '../domain/reservation.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../domain/reservation-repository.js';
import { ROOM_CATALOG, type RoomCatalog } from '../domain/room-catalog.js';
import type { TimeSlot } from '../domain/time-slot.js';

type Scope = 'party' | 'manager';

@Injectable()
export class ReservationAccess {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    readonly repo: ReservationRepository,
    @Inject(ROOM_CATALOG) readonly catalog: RoomCatalog,
    private readonly authorization: AuthorizationService,
  ) {}

  /**
   * party: booking client, room manager or admin. manager: room manager or
   * admin. Strangers get 404 so ids do not leak; the client gets 403.
   */
  async loadFor(id: string, userId: string, scope: Scope): Promise<Reservation> {
    const r = await this.repo.get(id);
    if (!r) throw notFound();
    const isClient = r.toSnapshot().userId === userId;
    if (isClient && scope === 'party') return r;
    if (
      (await this.catalog.ownerOf(r.roomId)) === userId ||
      (await this.authorization.isAdmin(userId))
    ) {
      return r;
    }
    throw isClient ? new ForbiddenException() : notFound();
  }

  async transition(
    id: string,
    userId: string,
    scope: Scope,
    act: (r: Reservation) => void,
  ): Promise<ReservationSnapshot> {
    const r = await this.loadFor(id, userId, scope);
    act(r);
    await this.repo.save(r);
    return r.toSnapshot();
  }
}

export async function assertFree(
  repo: ReservationRepository,
  roomId: string,
  slot: TimeSlot,
  selfId?: string,
): Promise<void> {
  if (await repo.findOverlapping(roomId, slot, selfId)) {
    throw new DomainError(
      'conflict',
      'SLOT_UNAVAILABLE',
      "Ce créneau n'est plus disponible.",
    );
  }
}
