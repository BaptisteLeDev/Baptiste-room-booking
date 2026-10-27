import { describe, expect, it, vi } from 'vitest';
import { QueryFailedError, type Repository } from 'typeorm';
import { DomainError } from '../../../common/domain-error.js';
import { Reservation } from '../domain/reservation.js';
import { TimeSlot } from '../domain/time-slot.js';
import type { ReservationEntity } from './reservation.entity.js';
import { TypeOrmReservationRepository } from './typeorm-reservation.repository.js';

const reservation = () =>
  Reservation.request({
    id: 'r1',
    roomId: 'room1',
    userId: 'u1',
    slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T12:00:00Z'),
    room: { capacity: 20, pricePerHour: 45 },
    currency: 'EUR',
    now: new Date('2026-10-01T08:00:00.000Z'),
  });

const pgError = (code: string) =>
  new QueryFailedError('q', [], Object.assign(new Error('x'), { code }));

const repoRejecting = (error: unknown) => {
  const rows = { save: vi.fn().mockRejectedValue(error) };
  const repo = new TypeOrmReservationRepository(
    rows as unknown as Repository<ReservationEntity>,
  );
  return { repo, rows };
};

describe('TypeOrmReservationRepository.save', () => {
  it('maps exclusion violation 23P01 to SLOT_UNAVAILABLE conflict', async () => {
    const { repo } = repoRejecting(pgError('23P01'));

    const err = await repo.save(reservation()).catch((e: unknown) => e);

    expect(err).toBeInstanceOf(DomainError);
    expect(err).toMatchObject({
      kind: 'conflict',
      code: 'SLOT_UNAVAILABLE',
    });
  });

  it('rethrows other database errors unchanged', async () => {
    const other = pgError('23503');
    const { repo } = repoRejecting(other);

    await expect(repo.save(reservation())).rejects.toBe(other);
  });
});
