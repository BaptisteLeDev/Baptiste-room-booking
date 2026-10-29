import { ParseUUIDPipe } from '@nestjs/common';
import { Args, ID, Query, Resolver } from '@nestjs/graphql';
import type { RoomSnapshot } from '../domain/entities/room.entity.js';
import { GetRoomUseCase } from '../application/use-cases/get-room.use-case.js';
import { RoomType } from './room.type.js';

@Resolver(() => RoomType)
export class RoomsResolver {
  constructor(private readonly getRoom: GetRoomUseCase) {}

  @Query(() => RoomType)
  async room(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<RoomSnapshot> {
    return this.getRoom.execute(id);
  }
}
