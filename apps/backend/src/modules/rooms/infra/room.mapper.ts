import {
  Room,
  type RoomSnapshot,
  type RoomStatus,
} from '../domain/entities/room.entity.js';
import { RoomEntity } from './room.entity.js';

export function toRoom(e: RoomEntity): Room {
  return Room.restore({
    id: e.id,
    ownerId: e.ownerId,
    name: e.name,
    ...(e.description !== null && { description: e.description }),
    capacity: e.capacity,
    location: e.location,
    equipment: e.equipment,
    pricePerHour: e.pricePerHour,
    status: e.status as RoomStatus,
    ...(e.imageUrl !== null && { imageUrl: e.imageUrl }),
    createdAt: e.createdAt.toISOString(),
  });
}

export function toEntity(s: RoomSnapshot): RoomEntity {
  return Object.assign(new RoomEntity(), {
    id: s.id,
    ownerId: s.ownerId,
    name: s.name,
    description: s.description ?? null,
    capacity: s.capacity,
    location: s.location,
    equipment: s.equipment,
    pricePerHour: s.pricePerHour,
    status: s.status,
    imageUrl: s.imageUrl ?? null,
    createdAt: new Date(s.createdAt),
  });
}
