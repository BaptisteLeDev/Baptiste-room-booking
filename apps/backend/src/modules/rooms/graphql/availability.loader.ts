import { Inject, Injectable, Scope } from '@nestjs/common';
import DataLoader from 'dataloader';
import {
  type AvailabilityPeriod,
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../domain/repositories/room.repository.interface.js';

@Injectable({ scope: Scope.REQUEST })
export class AvailabilityLoader {
  readonly byRoom = new DataLoader<string, AvailabilityPeriod[]>((ids) =>
    this.rooms.findUpcomingAvailabilities(ids),
  );

  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
  ) {}
}
