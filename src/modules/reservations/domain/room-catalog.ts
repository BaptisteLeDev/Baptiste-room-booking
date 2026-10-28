import type { RoomTerms } from './reservation.js';

export interface RoomCatalog {
  find(roomId: string): Promise<RoomTerms | undefined>;
  /** Owner of the room whatever its status. */
  ownerOf(roomId: string): Promise<string | undefined>;
}

export const ROOM_CATALOG = Symbol('RoomCatalog');
