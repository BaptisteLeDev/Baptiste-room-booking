import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RoomTerms } from '../domain/reservation.js';
import type { RoomCatalog } from '../domain/room-catalog.js';
import { RoomRow } from './room-row.entity.js';

@Injectable()
export class TypeOrmRoomCatalog implements RoomCatalog {
  constructor(
    @InjectRepository(RoomRow)
    private readonly rooms: Repository<RoomRow>,
  ) {}

  async find(roomId: string): Promise<RoomTerms | undefined> {
    const room = await this.rooms.findOne({
      where: { id: roomId, status: 'ACTIVE' },
      select: ['capacity', 'pricePerHour'],
    });
    return room
      ? { capacity: room.capacity, pricePerHour: room.pricePerHour }
      : undefined;
  }

  async ownerOf(roomId: string): Promise<string | undefined> {
    const room = await this.rooms.findOne({
      where: { id: roomId },
      select: ['ownerId'],
    });
    return room?.ownerId;
  }
}
