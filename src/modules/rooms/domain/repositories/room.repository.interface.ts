import type { Room } from '../entities/room.entity.js';

export type AvailabilitySlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

export type AvailabilityQuery = {
  date: string;
  startTime?: string;
  endTime?: string;
};

export type RoomListFilter = {
  page: number;
  pageSize: number;
  search?: string;
  location?: string;
  capacityMin?: number;
  capacityMax?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  available?: boolean;
};

export type RoomPage = {
  page: number;
  pageSize: number;
  total: number;
  items: Room[];
};

export interface IRoomRepository {
  save(room: Room): Promise<Room>;
  findById(id: string): Promise<Room | null>;
  findAll(filter: RoomListFilter): Promise<RoomPage>;
  delete(id: string): Promise<void>;
  findAvailability(
    roomId: string,
    query: AvailabilityQuery,
  ): Promise<AvailabilitySlot[]>;
  replaceAvailability(
    roomId: string,
    date: string,
    slots: AvailabilitySlot[],
  ): Promise<void>;
}

export const ROOM_REPOSITORY = Symbol('IRoomRepository');
