import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedRooms } from '../../../../contract.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
  type RoomListFilter,
} from '../../domain/repositories/room.repository.interface.js';

@Injectable()
export class ListRoomsUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
  ) {}

  async execute(filter: RoomListFilter): Promise<PaginatedRooms> {
    const page = await this.rooms.findAll(filter);
    return {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      items: page.items.map((room) => room.toSnapshot()),
    };
  }
}
