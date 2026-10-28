import { Inject, Injectable } from '@nestjs/common';
import {
  AvailabilityQuery,
  AvailabilitySlot,
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { loadRoom } from '../load-room.js';

@Injectable()
export class GetRoomAvailabilityUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
  ) {}

  async execute(
    roomId: string,
    query: AvailabilityQuery,
  ): Promise<AvailabilitySlot[]> {
    await loadRoom(this.rooms, roomId);
    return this.rooms.findAvailability(roomId, query);
  }
}
