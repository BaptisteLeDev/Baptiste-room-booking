import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  RoomCreateRequest,
  Room as RoomDto,
} from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/authorization.service.js';
import { Room } from '../../domain/entities/room.entity.js';
import {
  type IRoomRepository,
  ROOM_REPOSITORY,
} from '../../domain/repositories/room.repository.interface.js';

@Injectable()
export class CreateRoomUseCase {
  constructor(
    @Inject(ROOM_REPOSITORY) private readonly rooms: IRoomRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(userId: string, body: RoomCreateRequest): Promise<RoomDto> {
    await this.authorization.assertManager(userId);
    const room = Room.create({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ownerId: userId,
      name: body.name,
      description: body.description,
      capacity: body.capacity,
      location: body.location,
      equipment: body.equipment ?? [],
      pricePerHour: body.pricePerHour,
      imageUrl: body.imageUrl,
    });
    return (await this.rooms.save(room)).toSnapshot();
  }
}
