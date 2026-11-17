import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type {
  RoomCreateRequest,
  Room as RoomDto,
} from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import { ImageOptimizer } from '../../../media/image-optimizer.js';
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
    private readonly images: ImageOptimizer,
  ) {}

  async execute(userId: string, body: RoomCreateRequest): Promise<RoomDto> {
    await this.authorization.assertManager(userId);
    const imageUrl = body.imageUrl
      ? await this.images.optimizeFromUrl(body.imageUrl)
      : undefined;
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
      imageUrl,
    });
    return (await this.rooms.save(room)).toSnapshot();
  }
}
