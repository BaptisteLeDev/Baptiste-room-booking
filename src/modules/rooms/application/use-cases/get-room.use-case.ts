import { Inject, Injectable } from '@nestjs/common';
import type { Room as RoomDto } from '../../../../contract.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';
import { orNotFound } from '../../../../common/not-found.js';

@Injectable()
export class GetRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
  ) {}

  async execute(id: string): Promise<RoomDto> {
    return orNotFound(await this.rooms.findById(id)).toSnapshot();
  }
}
