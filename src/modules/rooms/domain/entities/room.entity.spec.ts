import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import { Room, type NewRoom } from './room.entity.js';

const newRoom: NewRoom = {
  id: 'room1',
  createdAt: '2026-01-01T00:00:00.000Z',
  ownerId: 'owner',
  name: 'Salle A',
  capacity: 10,
  location: 'Paris',
  equipment: [],
  pricePerHour: 20,
};

const rejection = (fn: () => unknown): DomainError => {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('did not reject');
};

describe('Room', () => {
  it('creates an ACTIVE room', () => {
    expect(Room.create(newRoom).toSnapshot()).toMatchObject({
      name: 'Salle A',
      status: 'ACTIVE',
    });
  });

  it.each([
    ['empty name', { name: ' ' }],
    ['zero capacity', { capacity: 0 }],
    ['fractional capacity', { capacity: 1.5 }],
    ['empty location', { location: '' }],
    ['negative price', { pricePerHour: -1 }],
  ])('rejects %s', (_, override) => {
    const error = rejection(() => Room.create({ ...newRoom, ...override }));

    expect(error).toBeInstanceOf(DomainError);
    expect(error.kind).toBe('invalid');
  });

  it('applies changes and keeps the invariants on update', () => {
    const room = Room.create(newRoom);

    room.update({ capacity: 4 });

    expect(room.toSnapshot().capacity).toBe(4);
    expect(() => room.update({ capacity: 0 })).toThrow(DomainError);
  });
});
