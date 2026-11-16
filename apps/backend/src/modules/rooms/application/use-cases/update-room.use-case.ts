import { Inject, Injectable } from '@nestjs/common';
import type {
  Room as RoomDto,
  RoomUpdateRequest,
} from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { orNotFound } from '../../../../common/not-found.js';
import { assertRoomOwnerOrAdmin } from '../room-access.js';

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
    const room = orNotFound(await this.rooms.findById(id));
    await assertRoomOwnerOrAdmin(this.authorization, userId, room.ownerId);
    room.update(body);
    return (await this.rooms.save(room)).toSnapshot();
  }
}
