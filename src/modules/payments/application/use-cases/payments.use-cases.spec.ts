import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import type { AuthorizationService } from '../../../auth/application/authorization.service.js';
import { Payment } from '../../domain/entities/payment.entity.js';
import type { PaymentProvider } from '../../domain/payment-provider.js';
import type { ReservationCatalog } from '../../domain/ports/reservation-catalog.port.js';
import type { IPaymentRepository } from '../../domain/repositories/payment.repository.interface.js';
import { CreatePaymentUseCase } from './create-payment.use-case.js';
import { GetPaymentUseCase } from './get-payment.use-case.js';

const reservation = {
  id: 'res1',
  userId: 'owner',
  amount: 40,
  currency: 'EUR',
};

const catalog: ReservationCatalog = {
  findPayableReservation: async (id) => (id === 'res1' ? reservation : null),
};

const provider: PaymentProvider = {
  initiate: async () => ({
    externalTransactionId: null,
    paymentUrl: null,
    status: 'PENDING',
  }),
};

const repo = (stored: Payment[] = []): IPaymentRepository => ({
  save: async (p) => {
    stored.push(p);
    return p;
  },
  findById: async (id) => stored.find((p) => p.toSnapshot().id === id) ?? null,
  existsForReservation: async (id) =>
    stored.some((p) => p.reservationId === id),
});

const request = { reservationId: 'res1', paymentMethod: 'CARD' } as const;

const rejection = (promise: Promise<unknown>) =>
  promise.then(
    () => new Error('did not reject'),
    (e: unknown) => e,
  );

describe('CreatePaymentUseCase', () => {
  it('creates a pending payment for the reservation owner', async () => {
    const useCase = new CreatePaymentUseCase(repo(), catalog, provider);

    await expect(useCase.execute('owner', request)).resolves.toMatchObject({
      reservationId: 'res1',
      amount: 40,
      currency: 'EUR',
      status: 'PENDING',
    });
  });

  it('rejects a non-owner with 403', async () => {
    const useCase = new CreatePaymentUseCase(repo(), catalog, provider);

    expect(await rejection(useCase.execute('other', request))).toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects a second payment with PAYMENT_ALREADY_EXISTS', async () => {
    const useCase = new CreatePaymentUseCase(repo(), catalog, provider);
    await useCase.execute('owner', request);

    expect(await rejection(useCase.execute('owner', request))).toMatchObject({
      code: 'PAYMENT_ALREADY_EXISTS',
    });
  });

  it('rejects an unknown reservation with NOT_FOUND', async () => {
    const useCase = new CreatePaymentUseCase(repo(), catalog, provider);

    const error = await rejection(
      useCase.execute('owner', { ...request, reservationId: 'nope' }),
    );

    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('GetPaymentUseCase', () => {
  const payment = Payment.restore({
    id: 'pay1',
    reservationId: 'res1',
    externalTransactionId: null,
    amount: 40,
    currency: 'EUR',
    status: 'PENDING',
    paymentUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  });
  const auth = (admin: boolean) =>
    ({ isAdmin: async () => admin }) as unknown as AuthorizationService;

  it('returns the payment to its owner', async () => {
    const useCase = new GetPaymentUseCase(
      repo([payment]),
      catalog,
      auth(false),
    );

    await expect(useCase.execute('owner', 'pay1')).resolves.toMatchObject({
      id: 'pay1',
    });
  });

  it('allows an admin', async () => {
    const useCase = new GetPaymentUseCase(repo([payment]), catalog, auth(true));

    await expect(useCase.execute('admin', 'pay1')).resolves.toMatchObject({
      id: 'pay1',
    });
  });

  it('rejects a non-owner non-admin with 403', async () => {
    const useCase = new GetPaymentUseCase(
      repo([payment]),
      catalog,
      auth(false),
    );

    expect(await rejection(useCase.execute('other', 'pay1'))).toBeInstanceOf(
      ForbiddenException,
    );
  });
});
