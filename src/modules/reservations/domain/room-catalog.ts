import type { RoomTerms } from './reservation.js';

export interface RoomCatalog {
  find(roomId: string): Promise<RoomTerms | undefined>;
}

export const ROOM_CATALOG = Symbol('RoomCatalog');
