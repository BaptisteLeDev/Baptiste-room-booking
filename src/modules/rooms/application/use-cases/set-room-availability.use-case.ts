import { Inject, Injectable } from '@nestjs/common';
import type { AvailabilityUpdateRequest } from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  AvailabilitySlot,
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { loadRoom } from '../load-room.js';

@Injectable()
export class SetRoomAvailabilityUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    roomId: string,
    userId: string,
    body: AvailabilityUpdateRequest,
  ): Promise<AvailabilitySlot[]> {
    const room = await loadRoom(this.rooms, roomId);
    await this.authorization.assertOwnerOrAdmin(userId, room.ownerId);
    await this.rooms.replaceAvailability(roomId, body.date, body.slots);
    return this.rooms.findAvailability(roomId, { date: body.date });
  }
}
