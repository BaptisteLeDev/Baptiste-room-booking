import { notFound } from '../../../common/not-found.js';
import type { Room } from '../domain/entities/room.entity.js';
import type { IRoomRepository } from '../domain/repositories/room.repository.interface.js';

export async function loadRoom(
  rooms: IRoomRepository,
  id: string,
): Promise<Room> {
  const room = await rooms.findById(id);
  if (!room) throw notFound();
  return room;
}
