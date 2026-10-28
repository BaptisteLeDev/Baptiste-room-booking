import { Inject, Injectable } from '@nestjs/common';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { loadRoom } from '../load-room.js';

@Injectable()
export class DeleteRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const room = await loadRoom(this.rooms, id);
    await this.authorization.assertOwnerOrAdmin(userId, room.ownerId);
    await this.rooms.delete(id);
  }
}
