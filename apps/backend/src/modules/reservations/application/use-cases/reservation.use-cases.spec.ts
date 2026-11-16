import { ForbiddenException } from '@nestjs/common';
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

const roles: Record<string, string> = {
  owner: 'GESTIONNAIRE',
  admin: 'ADMINISTRATEUR',
};
const authorization = {
  isAdmin: async (id: string) => id === 'admin',
  role: async (id: string) => roles[id] ?? 'CLIENT',
};

const at = (day: string, a: string, b: string) => ({
  startAt: `2027-11-${day}T${a}:00:00Z`,
  endAt: `2027-11-${day}T${b}:00:00Z`,
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
    repo,
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

  it('closed slot -> conflict SLOT_UNAVAILABLE', async () => {
    svc.repo.closed.add('2027-11-02T09:00:00.000Z');
    const e = await rejection<DomainError>(create('room1', '02', '09', '12'));
    expect(e.kind).toBe('conflict');
    expect(e.code).toBe('SLOT_UNAVAILABLE');
  });

  it('slot-change onto closed slot -> conflict SLOT_UNAVAILABLE', async () => {
    const a = await create('room1', '02', '09', '12');
    svc.repo.closed.add('2027-11-02T13:00:00.000Z');
    const e = await rejection<DomainError>(
      svc.updateReservation(a.id, 'u1', at('02', '13', '15')),
    );
    expect(e.code).toBe('SLOT_UNAVAILABLE');
  });

  it('creates PENDING reservation', async () => {
    const r = await create('room1', '02', '09', '12');
    expect(r.status).toBe('PENDING_PAYMENT');
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

  it('amend CONFIRMED slot change, even free -> 409 status conflict', async () => {
    const a = await create('room1', '02', '09', '12');
    await svc.confirmReservation(a.id, 'owner');
    const e = await rejection<DomainError>(
      svc.updateReservation(a.id, 'u1', at('02', '10', '11')),
    );
    expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
  });

  it('amend own reservation shifted 15 min -> ok', async () => {
    const a = await create('room1', '02', '09', '12');
    const ok = await svc.updateReservation(a.id, 'u1', {
      startAt: '2027-11-02T09:15:00Z',
      endAt: '2027-11-02T12:15:00Z',
    });
    expect(ok.startAt).toBe('2027-11-02T09:15:00.000Z');
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
      svc.updateReservation(a.id, 'u1', { endAt: '2027-11-02T08:00:00Z' }),
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
      from: '2027-11-03',
      to: '2027-11-04',
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

  describe('cancel and reject by role', () => {
    it('client cancels own reservation -> ok', async () => {
      const r = await create('room1', '07', '09', '10');
      await svc.cancelReservation(r.id, 'u1');
      expect((await svc.getReservation(r.id, 'u1')).status).toBe('CANCELLED');
    });

    it('room owner cancel -> 403, reservation unchanged', async () => {
      const r = await create('room1', '07', '09', '10');
      const e = await rejection<ForbiddenException>(
        svc.cancelReservation(r.id, 'owner'),
      );
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((await svc.getReservation(r.id, 'u1')).status).toBe(
        'PENDING_PAYMENT',
      );
    });

    it('demoted room owner (now CLIENT) confirm and reject -> 403', async () => {
      const r = await create('room1', '07', '09', '10');
      roles.owner = 'CLIENT';
      try {
        expect(
          await rejection<ForbiddenException>(
            svc.confirmReservation(r.id, 'owner'),
          ),
        ).toBeInstanceOf(ForbiddenException);
        expect(
          await rejection<ForbiddenException>(
            svc.rejectReservation(r.id, 'owner'),
          ),
        ).toBeInstanceOf(ForbiddenException);
      } finally {
        roles.owner = 'GESTIONNAIRE';
      }
      expect((await svc.getReservation(r.id, 'u1')).status).toBe(
        'PENDING_PAYMENT',
      );
    });

    it('admin cancel -> ok', async () => {
      const r = await create('room1', '07', '09', '10');
      await svc.cancelReservation(r.id, 'admin');
      expect((await svc.getReservation(r.id, 'u1')).status).toBe('CANCELLED');
    });

    it('stranger cancel -> not_found', async () => {
      const r = await create('room1', '07', '09', '10');
      expect(
        (await rejection<DomainError>(svc.cancelReservation(r.id, 'u2'))).kind,
      ).toBe('not_found');
    });

    it('room owner reject -> ok', async () => {
      const r = await create('room1', '07', '09', '10');
      const rejected = await svc.rejectReservation(r.id, 'owner');
      expect(rejected.status).toBe('REFUSED');
    });

    it('room owner update -> 403, reservation unchanged', async () => {
      const r = await create('room1', '07', '09', '10');
      const e = await rejection<ForbiddenException>(
        svc.updateReservation(r.id, 'owner', { comment: 'pwned' }),
      );
      expect(e).toBeInstanceOf(ForbiddenException);
      expect((await svc.getReservation(r.id, 'u1')).comment).toBeUndefined();
    });

    it('client update own reservation -> ok', async () => {
      const r = await create('room1', '07', '09', '10');
      const ok = await svc.updateReservation(r.id, 'u1', { comment: 'c' });
      expect(ok.comment).toBe('c');
    });

    it('admin update -> ok', async () => {
      const r = await create('room1', '07', '09', '10');
      const ok = await svc.updateReservation(r.id, 'admin', { comment: 'c' });
      expect(ok.comment).toBe('c');
    });
  });

  describe('stale write after a concurrent cancel', () => {
    const cancelAfterLoad = (
      repo: InMemoryReservationRepository,
      id: string,
    ) => {
      const get = repo.get.bind(repo);
      let fired = false;
      repo.get = async (x) => {
        const r = await get(x);
        if (!fired && x === id) {
          fired = true;
          await cancel.execute(id, 'u1');
        }
        return r;
      };
    };
    let cancel: CancelReservationUseCase;
    let repo: InMemoryReservationRepository;
    let access: ReservationAccess;
    let id: string;

    beforeEach(async () => {
      repo = new InMemoryReservationRepository();
      access = new ReservationAccess(repo, catalog, authorization as never);
      cancel = new CancelReservationUseCase(access);
      id = (
        await new CreateReservationUseCase(repo, catalog).execute('u1', {
          roomId: 'room1',
          ...at('03', '09', '12'),
        })
      ).id;
    });

    it('update does not revive CANCELLED', async () => {
      const update = new UpdateReservationUseCase(access, repo, catalog);
      cancelAfterLoad(repo, id);

      const e = await rejection<DomainError>(
        update.execute(id, 'u1', { comment: 'late' }),
      );

      expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
      expect((await repo.get(id))?.toSnapshot().status).toBe('CANCELLED');
    });

    it('confirm does not revive CANCELLED', async () => {
      const confirm = new ConfirmReservationUseCase(access);
      cancelAfterLoad(repo, id);

      const e = await rejection<DomainError>(confirm.execute(id, 'owner'));

      expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
      expect((await repo.get(id))?.toSnapshot().status).toBe('CANCELLED');
    });
  });
});
