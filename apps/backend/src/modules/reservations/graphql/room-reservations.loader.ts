import { Inject, Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import { AuthorizationService } from '../../auth/application/authorization.service.js';
import type { Role } from '../../users/domain/entities/user.entity.js';
import type { ReservationStatus } from '../domain/enums/reservation-status.enum.js';
import type { ReservationSnapshot } from '../domain/reservation.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../domain/reservation-repository.js';

@Injectable({ scope: Scope.REQUEST })
export class RoomReservationsLoader {
  private readonly byStatus = new Map<
    string,
    DataLoader<string, ReservationSnapshot[]>
  >();
  private role?: Promise<Role>;

  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservations: ReservationRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  load(
    roomId: string,
    status?: ReservationStatus,
  ): Promise<ReservationSnapshot[]> {
    const key = status ?? 'ALL';
    let loader = this.byStatus.get(key);
    if (!loader) {
      loader = new DataLoader(async (roomIds) => {
        const rows = (await this.reservations.findByRooms(roomIds, status)).map(
          (r) => r.toSnapshot(),
        );
        return roomIds.map((id) => rows.filter((r) => r.roomId === id));
      });
      this.byStatus.set(key, loader);
    }
    return loader.load(roomId);
  }

  viewerRole(userId: string): Promise<Role> {
    return (this.role ??= this.authorization.role(userId));
  }
}
