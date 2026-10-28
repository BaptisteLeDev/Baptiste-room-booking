import { beforeEach, describe, expect, it } from 'vitest';
import { InMemoryReservationRepository } from '../../../../../test/helpers/in-memory-reservation.repository.js';
import { DomainError } from '../../../../common/domain-error.js';
import type { RoomCatalog } from '../../domain/room-catalog.js';
import { ReservationAccess } from '../reservation-access.js';
import { CancelReservationUseCase } from './cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from './confirm-reservation.use-case.js';
import { CreateReservationUseCase } from './create-reservation.use-case.js';
import { GetReservationUseCase } from './get-reservation.use-case.js';
import { ListReservationsUseCase } from './list-reservations.use-case.js';
import { RejectReservationUseCase } from './reject-reservation.use-case.js';
import { UpdateReservationUseCase } from './update-reservation.use-case.js';
import { rejection } from '../../../../../test/helpers/rejection.js';

const catalog: RoomCatalog = {
  find: async (id) =>
    id === 'room1' || id === 'room2'
      ? { capacity: 20, pricePerHour: 45 }
      : undefined,
  ownerOf: async (id) =>
    id === 'room1' || id === 'room2' ? 'owner' : undefined,
};

const authorization = { isAdmin: async (id: string) => id === 'admin' };

const at = (day: string, a: string, b: string) => ({
  startAt: `2026-11-${day}T${a}:00:00Z`,
  endAt: `2026-11-${day}T${b}:00:00Z`,
});

const useCases = () => {
  const repo = new InMemoryReservationRepository();
  const access = new ReservationAccess(repo, catalog, authorization as never);
  const create = new CreateReservationUseCase(repo, catalog);
  const get = new GetReservationUseCase(access);
  const update = new UpdateReservationUseCase(access, repo, catalog);
  const cancel = new CancelReservationUseCase(access);
  const confirm = new ConfirmReservationUseCase(access);
  const reject = new RejectReservationUseCase(access);
  const list = new ListReservationsUseCase(repo);
  return {
    createReservation: create.execute.bind(create),
    getReservation: get.execute.bind(get),
    updateReservation: update.execute.bind(update),
    cancelReservation: cancel.execute.bind(cancel),
    confirmReservation: confirm.execute.bind(confirm),
    rejectReservation: reject.execute.bind(reject),
    listReservations: list.execute.bind(list),
  };
};

describe('reservation use cases', () => {
  let svc: ReturnType<typeof useCases>;
  const create = (
    roomId: string,
    day: string,
    a: string,
    b: string,
    u = 'u1',
  ) => svc.createReservation(u, { roomId, ...at(day, a, b) });

  beforeEach(() => {
    svc = useCases();
  });

  it('creates PENDING reservation', async () => {
    const r = await create('room1', '02', '09', '12');
    expect(r.status).toBe('PENDING');
    expect(r.totalAmount).toBe(135);
    expect(r.currency).toBe('EUR');
    expect(await svc.getReservation(r.id, 'u1')).toEqual(r);
  });

  it('unknown room -> not_found', async () => {
    const e = await rejection<DomainError>(create('nope', '02', '09', '12'));
    expect(e.kind).toBe('not_found');
    expect(e.code).toBe('NOT_FOUND');
  });

  it('overlap -> conflict SLOT_UNAVAILABLE', async () => {
    await create('room1', '02', '09', '12');
    const e = await rejection<DomainError>(
      create('room1', '02', '11', '13', 'u2'),
    );
    expect(e.kind).toBe('conflict');
    expect(e.code).toBe('SLOT_UNAVAILABLE');
  });

  it('adjacent and other-room creates are OK', async () => {
    await create('room1', '02', '09', '12');
    await create('room1', '02', '12', '13');
    await create('room2', '02', '09', '12');
  });

  it('cancelled reservation frees slot', async () => {
    const r = await create('room1', '02', '09', '12');
    await svc.cancelReservation(r.id, 'u1');
    await create('room1', '02', '09', '12');
  });

  it('amend CONFIRMED onto another active slot -> 409, own slot OK', async () => {
    const a = await create('room1', '02', '09', '12');
    await svc.confirmReservation(a.id, 'owner');
    await create('room1', '02', '13', '15');
    const e = await rejection<DomainError>(
      svc.updateReservation(a.id, 'u1', at('02', '14', '16')),
    );
    expect(e.code).toBe('SLOT_UNAVAILABLE');
    const ok = await svc.updateReservation(a.id, 'u1', at('02', '10', '11'));
    expect(ok.startAt).toBe('2026-11-02T10:00:00.000Z');
    expect(ok.status).toBe('PENDING');
  });

  it('amend own reservation shifted 15 min -> ok', async () => {
    const a = await create('room1', '02', '09', '12');
    const ok = await svc.updateReservation(a.id, 'u1', {
      startAt: '2026-11-02T09:15:00Z',
      endAt: '2026-11-02T12:15:00Z',
    });
    expect(ok.startAt).toBe('2026-11-02T09:15:00.000Z');
  });

  it('amend CANCELLED onto taken slot -> status conflict first', async () => {
    const a = await create('room1', '02', '09', '12');
    await svc.cancelReservation(a.id, 'u1');
    await create('room1', '02', '13', '15');
    const e = await rejection<DomainError>(
      svc.updateReservation(a.id, 'u1', at('02', '14', '16')),
    );
    expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
  });

  it('PATCH only endAt earlier than startAt -> invalid', async () => {
    const a = await create('room1', '02', '09', '12');
    const e = await rejection<DomainError>(
      svc.updateReservation(a.id, 'u1', { endAt: '2026-11-02T08:00:00Z' }),
    );
    expect(e.kind).toBe('invalid');
  });

  it('unknown id -> not_found', async () => {
    for (const p of [
      svc.confirmReservation('x', 'owner'),
      svc.getReservation('x', 'u1'),
      svc.cancelReservation('x', 'u1'),
      svc.rejectReservation('x', 'owner'),
      svc.updateReservation('x', 'u1', { comment: 'c' }),
    ]) {
      expect((await rejection<DomainError>(p)).kind).toBe('not_found');
    }
  });

  it('list filters user, status, from/to inclusive, pages', async () => {
    const a = await create('room1', '02', '09', '10');
    await create('room1', '03', '09', '10');
    await create('room1', '04', '09', '10');
    await create('room1', '05', '09', '10', 'u2');
    await svc.confirmReservation(a.id, 'owner');
    const base = { page: 1, pageSize: 20 };
    expect((await svc.listReservations('u1', base)).total).toBe(3);
    expect(
      (await svc.listReservations('u1', { ...base, status: 'CONFIRMED' }))
        .total,
    ).toBe(1);
    const ranged = await svc.listReservations('u1', {
      ...base,
      from: '2026-11-03',
      to: '2026-11-04',
    });

    expect(ranged.total).toBe(2);
    const paged = await svc.listReservations('u1', { page: 2, pageSize: 2 });
    expect(paged).toMatchObject({ page: 2, pageSize: 2, total: 3 });
    expect(paged.items).toHaveLength(1);
  });

  it('does not expose or mutate another user reservation', async () => {
    const r = await create('room1', '06', '09', '10', 'u1');

    expect(
      (await rejection<DomainError>(svc.getReservation(r.id, 'u2'))).kind,
    ).toBe('not_found');
    expect(
      (
        await rejection<DomainError>(
          svc.updateReservation(r.id, 'u2', { comment: 'x' }),
        )
      ).kind,
    ).toBe('not_found');
    expect(
      (await rejection<DomainError>(svc.cancelReservation(r.id, 'u2'))).kind,
    ).toBe('not_found');
    expect((await svc.getReservation(r.id, 'u1')).comment).toBeUndefined();
  });
});
