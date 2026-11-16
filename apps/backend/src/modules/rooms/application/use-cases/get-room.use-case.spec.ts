import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import { Room } from '../../domain/entities/room.entity.js';
import type { IRoomRepository } from '../../domain/repositories/room.repository.interface.js';
import { GetRoomUseCase } from './get-room.use-case.js';

const unused = async (): Promise<never> => {
  throw new Error('not used by this use case');
};

const repo = (rooms: Room[]): IRoomRepository => ({
  save: unused,
  findById: async (id) => rooms.find((r) => r.toSnapshot().id === id) ?? null,
  findAll: unused,
  delete: unused,
  findAvailability: unused,
  findUpcomingAvailabilities: unused,
  replaceAvailability: unused,
});

const room = Room.restore({
  id: 'room1',
  ownerId: 'owner',
  name: 'Salle A',
  capacity: 10,
  location: 'Paris',
  equipment: [],
  pricePerHour: 20,
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('GetRoomUseCase', () => {
  it('returns the room snapshot found by id', async () => {
    const useCase = new GetRoomUseCase(repo([room]));

    await expect(useCase.execute('room1')).resolves.toMatchObject({
      id: 'room1',
      name: 'Salle A',
    });
  });

  it('rejects with NOT_FOUND when the room is unknown', async () => {
    const useCase = new GetRoomUseCase(repo([]));

    const error = await useCase.execute('missing').then(
      () => new Error('did not reject'),
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'NOT_FOUND' });
  });
});
