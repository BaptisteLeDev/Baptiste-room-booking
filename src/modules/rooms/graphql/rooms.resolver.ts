import { ParseUUIDPipe } from '@nestjs/common';
import {
  Args,
  ID,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import type { RoomSnapshot } from '../domain/entities/room.entity.js';
import type { AvailabilityPeriod } from '../domain/repositories/room.repository.interface.js';
import { AvailabilityLoader } from './availability.loader.js';
import { AvailabilityType } from './availability.type.js';
import type { Room } from '../../../contract.js';
import { GetRoomUseCase } from '../application/use-cases/get-room.use-case.js';
import { ListRoomsUseCase } from '../application/use-cases/list-rooms.use-case.js';
import { RoomSearchInput } from './room-search.input.js';
import { RoomType } from './room.type.js';

@Resolver(() => RoomType)
export class RoomsResolver {
  constructor(
    private readonly getRoom: GetRoomUseCase,
    private readonly listRooms: ListRoomsUseCase,
    private readonly availabilities: AvailabilityLoader,
  ) {}

  @Query(() => RoomType)
  async room(
    @Args('id', { type: () => ID }, ParseUUIDPipe) id: string,
  ): Promise<RoomSnapshot> {
    return this.getRoom.execute(id);
  }

  @Query(() => [RoomType])
  async searchRooms(
    @Args('filter', { type: () => RoomSearchInput, nullable: true })
    filter: RoomSearchInput = new RoomSearchInput(),
  ): Promise<Room[]> {
    const { page, pageSize, minCapacity, maxPricePerHour } = filter;
    const result = await this.listRooms.execute({
      page,
      pageSize,
      capacityMin: minCapacity,
      priceMax: maxPricePerHour,
    });
    return result.items;
  }

  @ResolveField('availabilities', () => [AvailabilityType])
  availabilitiesOf(@Parent() room: Room): Promise<AvailabilityPeriod[]> {
    return this.availabilities.byRoom.load(room.id);
  }
}
