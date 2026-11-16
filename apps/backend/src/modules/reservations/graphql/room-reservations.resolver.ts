import { ForbiddenException } from '@nestjs/common';
import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUserId } from '../../auth/current-user.decorator.js';
import { ReservationStatus } from '../domain/enums/reservation-status.enum.js';
import { RoomReservationsLoader } from './room-reservations.loader.js';
import { RoomType } from '../../rooms/graphql/room.type.js';
import { ReservationType } from './reservation.type.js';

// code-first cannot bind a field to a type by name: adapter-level import only
@Resolver(() => RoomType)
export class RoomReservationsResolver {
  constructor(private readonly loader: RoomReservationsLoader) {}

  @ResolveField('reservations', () => [ReservationType], { nullable: true })
  async reservations(
    @Parent() room: { id: string; ownerId: string },
    @CurrentUserId() userId: string,
    @Args('status', { type: () => ReservationStatus, nullable: true })
    status?: ReservationStatus,
  ): Promise<ReservationType[]> {
    // same rule as rooms assertRoomOwnerOrAdmin, role memoized per request
    const role = await this.loader.viewerRole(userId);
    const manager = userId === room.ownerId && role !== 'CLIENT';
    if (!manager && role !== 'ADMINISTRATEUR') throw new ForbiddenException();
    const rows = await this.loader.load(room.id, status);
    return rows.map((r) => ({
      ...r,
      startAt: new Date(r.startAt),
      endAt: new Date(r.endAt),
    }));
  }
}
