import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { DomainError } from '../../../common/domain-error.js';
import { notFound, orNotFound } from '../../../common/not-found.js';
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

type Scope = 'client' | 'party' | 'manager';

@Injectable()
export class ReservationAccess {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly repo: ReservationRepository,
    @Inject(ROOM_CATALOG) private readonly catalog: RoomCatalog,
    private readonly authorization: AuthorizationService,
  ) {}

  /**
   * client: booking client or admin. party: client, room manager or admin.
   * manager: room manager or admin. Strangers get 404 so ids do not leak;
   * a client or room manager refused by scope gets 403.
   */
  async loadFor(
    id: string,
    userId: string,
    scope: Scope,
  ): Promise<Reservation> {
    const r = orNotFound(await this.repo.get(id));
    const isClient = r.toSnapshot().userId === userId;
    if (isClient && scope !== 'manager') return r;
    const isOwner = (await this.catalog.ownerOf(r.roomId)) === userId;
    const isManagerOwner =
      isOwner &&
      scope !== 'client' &&
      (await this.authorization.role(userId)) !== 'CLIENT';
    if (isManagerOwner || (await this.authorization.isAdmin(userId))) {
      return r;
    }
    throw isClient || isOwner ? new ForbiddenException() : notFound();
  }

  async transition(
    id: string,
    userId: string,
    scope: Scope,
    act: (r: Reservation) => void,
  ): Promise<ReservationSnapshot> {
    const r = await this.loadFor(id, userId, scope);
    const loadedStatus = r.toSnapshot().status;
    act(r);
    await this.repo.save(r, loadedStatus);
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
