import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import type { AuthorizationService } from '../../../auth/application/authorization.service.js';
import { Reservation } from '../../../reservations/domain/reservation.js';
import type { AdminQuery } from '../../domain/repositories/admin-query.port.js';
import { ListAdminReservationsUseCase } from './list-admin-reservations.use-case.js';
import { StatisticsUseCase } from './statistics.use-case.js';

const stats = {
  totalUsers: 3,
  totalRooms: 2,
  totalReservations: 5,
  confirmedReservations: 2,
  cancelledReservations: 1,
  totalRevenue: 120.5,
};
const reservation = Reservation.restore({
  id: 'r1',
  roomId: 'room',
  userId: 'u',
  startAt: '2026-01-01T10:00:00.000Z',
  endAt: '2026-01-01T11:00:00.000Z',
  status: 'CONFIRMED',
  totalAmount: 20,
  currency: 'EUR',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const query: AdminQuery = {
  listReservations: async () => ({ items: [reservation], total: 41 }),
  statistics: async () => stats,
};
const auth = (admin: boolean) =>
  ({
    assertAdmin: async () => {
      if (!admin) throw new ForbiddenException();
    },
  }) as unknown as AuthorizationService;

const filter = { page: 2, pageSize: 20 };

describe('ListAdminReservationsUseCase', () => {
  it('rejects non-admin with 403', async () => {
    const useCase = new ListAdminReservationsUseCase(query, auth(false));
    await expect(useCase.execute('u', filter)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('returns page, pageSize, total and snapshots', async () => {
    const useCase = new ListAdminReservationsUseCase(query, auth(true));
    await expect(useCase.execute('a', filter)).resolves.toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      items: [reservation.toSnapshot()],
    });
  });
});

describe('StatisticsUseCase', () => {
  it('rejects non-admin with 403', async () => {
    const useCase = new StatisticsUseCase(query, auth(false));
    await expect(useCase.execute('u', {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('passes statistics through for admin', async () => {
    const useCase = new StatisticsUseCase(query, auth(true));
    await expect(useCase.execute('a', {})).resolves.toEqual(stats);
  });

  it('rejects from after to', async () => {
    const useCase = new StatisticsUseCase(query, auth(true));
    const err = await useCase
      .execute('a', { from: '2026-02-01', to: '2026-01-01' })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(DomainError);
  });
});
