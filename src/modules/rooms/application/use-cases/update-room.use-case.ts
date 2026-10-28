import { Inject, Injectable } from '@nestjs/common';
import type {
  Room as RoomDto,
  RoomUpdateRequest,
} from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/authorization.service.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { loadRoom } from '../load-room.js';

@Injectable()
export class UpdateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    id: string,
    userId: string,
    body: RoomUpdateRequest,
  ): Promise<RoomDto> {
    const room = await loadRoom(this.rooms, id);
    await this.authorization.assertOwnerOrAdmin(userId, room.ownerId);
    room.update(body);
    return (await this.rooms.save(room)).toSnapshot();
  }
}
