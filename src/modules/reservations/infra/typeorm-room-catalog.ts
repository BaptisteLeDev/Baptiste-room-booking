import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RoomTerms } from '../domain/reservation.js';
import type { RoomCatalog } from '../domain/room-catalog.js';
import { RoomEntity } from '../../rooms/infra/room.entity.js';

@Injectable()
export class TypeOrmRoomCatalog implements RoomCatalog {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly rooms: Repository<RoomEntity>,
  ) {}

  async find(roomId: string): Promise<RoomTerms | undefined> {
    const room = await this.rooms.findOne({
      where: { id: roomId },
      select: ['capacity', 'pricePerHour'],
    });
    return room
      ? { capacity: room.capacity, pricePerHour: room.pricePerHour }
      : undefined;
  }
}
