import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AuthorizationService } from '../../../auth/application/authorization.service.js';
import { ReservationStatus } from '../../domain/enums/reservation-status.enum.js';
import { InvalidStateTransitionException } from '../../domain/exceptions/invalid-state-transition.exception.js';
import { Reservation } from '../../domain/reservation.js';
import type { ReservationAccess } from '../reservation-access.js';
import { SetReservationStatusUseCase } from './set-reservation-status.use-case.js';

const make = (status: ReservationStatus) =>
  Reservation.restore({
    id: 'r1',
    roomId: 'room',
    userId: 'u',
    startAt: '2026-01-01T10:00:00.000Z',
    endAt: '2026-01-01T11:00:00.000Z',
    status,
    totalAmount: 20,
    currency: 'EUR',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

const access = (status: ReservationStatus) =>
  ({
    transition: async (
      _id: string,
      _user: string,
      _scope: string,
      act: (r: Reservation) => void,
    ) => {
      const r = make(status);
      act(r);
      return r.toSnapshot();
    },
  }) as unknown as ReservationAccess;

const auth = (admin: boolean) =>
  ({
    assertAdmin: async () => {
      if (!admin) throw new ForbiddenException();
    },
  }) as unknown as AuthorizationService;

describe('SetReservationStatusUseCase', () => {
  it('rejects non-admin with 403', async () => {
    const useCase = new SetReservationStatusUseCase(
      access(ReservationStatus.PENDING_PAYMENT),
      auth(false),
    );
    await expect(
      useCase.execute('r1', 'u', ReservationStatus.CONFIRMED),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies a domain transition', async () => {
    const useCase = new SetReservationStatusUseCase(
      access(ReservationStatus.PENDING_PAYMENT),
      auth(true),
    );
    await expect(
      useCase.execute('r1', 'a', ReservationStatus.CONFIRMED),
    ).resolves.toMatchObject({ status: ReservationStatus.CONFIRMED });
  });

  it('refuses a transition the state machine forbids', async () => {
    const useCase = new SetReservationStatusUseCase(
      access(ReservationStatus.CANCELLED),
      auth(true),
    );
    await expect(
      useCase.execute('r1', 'a', ReservationStatus.CONFIRMED),
    ).rejects.toBeInstanceOf(InvalidStateTransitionException);
  });

  it('refuses PENDING_PAYMENT as a target', async () => {
    const useCase = new SetReservationStatusUseCase(
      access(ReservationStatus.CONFIRMED),
      auth(true),
    );
    await expect(
      useCase.execute('r1', 'a', ReservationStatus.PENDING_PAYMENT),
    ).rejects.toBeInstanceOf(InvalidStateTransitionException);
  });
});
