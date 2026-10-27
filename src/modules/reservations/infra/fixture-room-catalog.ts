import { Injectable } from '@nestjs/common';
import type { RoomTerms } from '../domain/reservation.js';
import type { RoomCatalog } from '../domain/room-catalog.js';
import { roomFixture } from '../../rooms/fixtures/room.fixture.js';

// ponytail: replace when Rooms domain lands
@Injectable()
export class FixtureRoomCatalog implements RoomCatalog {
  async find(roomId: string): Promise<RoomTerms | undefined> {
    return roomId === roomFixture.id
      ? {
          capacity: roomFixture.capacity,
          pricePerHour: roomFixture.pricePerHour,
        }
      : undefined;
  }
}
