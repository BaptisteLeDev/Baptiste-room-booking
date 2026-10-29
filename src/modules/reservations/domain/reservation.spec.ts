import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../common/domain-error.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { InvalidStateTransitionException } from './exceptions/invalid-state-transition.exception.js';
import { Reservation } from './reservation.js';
import { TimeSlot } from './time-slot.js';

const room = { capacity: 20, pricePerHour: 45 };
const now = new Date('2026-10-01T08:00:00.000Z');
const slot = TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T12:00:00Z');

const make = (extra: { numberOfParticipants?: number } = {}) =>
  Reservation.request({
    id: 'r1',
    roomId: 'room1',
    userId: 'u1',
    slot,
    room,
    currency: 'EUR',
    now,
    ...extra,
  });

const confirmed = () => {
  const r = make();
  r.confirm();
  return r;
};

const reach: Record<ReservationStatus, () => Reservation> = {
  [ReservationStatus.PENDING_PAYMENT]: make,
  [ReservationStatus.CONFIRMED]: confirmed,
  [ReservationStatus.REFUSED]: () => {
    const r = make();
    r.reject();
    return r;
  },
  [ReservationStatus.CANCELLED]: () => {
    const r = make();
    r.cancel();
    return r;
  },
  [ReservationStatus.COMPLETED]: () => {
    const r = confirmed();
    r.complete();
    return r;
  },
};

const transitions: Record<
  Exclude<ReservationStatus, ReservationStatus.PENDING_PAYMENT>,
  (r: Reservation) => void
> = {
  [ReservationStatus.CONFIRMED]: (r) => r.confirm(),
  [ReservationStatus.REFUSED]: (r) => r.reject(),
  [ReservationStatus.CANCELLED]: (r) => r.cancel(),
  [ReservationStatus.COMPLETED]: (r) => r.complete(),
};

const allowed: [ReservationStatus, ReservationStatus][] = [
  [ReservationStatus.PENDING_PAYMENT, ReservationStatus.CONFIRMED],
  [ReservationStatus.PENDING_PAYMENT, ReservationStatus.REFUSED],
  [ReservationStatus.PENDING_PAYMENT, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED, ReservationStatus.CANCELLED],
  [ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED],
];

const thrown = (fn: () => void): DomainError => {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('did not throw');
};

describe('Reservation', () => {
  it('request -> PENDING_PAYMENT with computed amount', () => {
    const s = make().toSnapshot();
    expect(s.status).toBe(ReservationStatus.PENDING_PAYMENT);
    expect(s.totalAmount).toBe(135);
    expect(s.createdAt).toBe(now.toISOString());
  });

  it('rounds half-cent totals half-up in cents', () => {
    const r = Reservation.request({
      id: 'r2',
      roomId: 'room1',
      userId: 'u1',
      slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T11:30:00Z'),
      room: { capacity: 20, pricePerHour: 19.99 },
      currency: 'EUR',
      now,
    });
    expect(r.toSnapshot().totalAmount).toBe(49.98);
  });

  it('rounds 1h45 at 33.33/h to 58.33', () => {
    const r = Reservation.request({
      id: 'r3',
      roomId: 'room1',
      userId: 'u1',
      slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T10:45:00Z'),
      room: { capacity: 20, pricePerHour: 33.33 },
      currency: 'EUR',
      now,
    });
    expect(r.toSnapshot().totalAmount).toBe(58.33);
  });

  it('rejects a slot starting before now', () => {
    const e = thrown(() =>
      Reservation.request({
        id: 'r4',
        roomId: 'room1',
        userId: 'u1',
        slot: TimeSlot.of('2026-09-30T09:00:00Z', '2026-09-30T10:00:00Z'),
        room,
        currency: 'EUR',
        now,
      }),
    );
    expect(e.kind).toBe('invalid');
    expect(e.code).toBe('VALIDATION_ERROR');
  });

  it('rejects participants over capacity', () => {
    const e = thrown(() => make({ numberOfParticipants: 21 }));
    expect(e.kind).toBe('invalid');
    expect(e.code).toBe('VALIDATION_ERROR');
  });

  it.each(
    (Object.keys(transitions) as (keyof typeof transitions)[]).flatMap((to) =>
      (Object.keys(reach) as ReservationStatus[]).map(
        (from) => [from, to] as const,
      ),
    ),
  )('transition %s -> %s is allowed only per spec', (from, to) => {
    const r = reach[from]();
    const isAllowed = allowed.some(([f, t]) => f === from && t === to);
    if (isAllowed) {
      transitions[to](r);
      expect(r.toSnapshot().status).toBe(to);
      return;
    }
    const e = thrown(() => transitions[to](r));
    expect(e).toBeInstanceOf(InvalidStateTransitionException);
    expect(e.kind).toBe('conflict');
    expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
    expect(r.toSnapshot().status).toBe(from);
  });

  it('final states accept no transition', () => {
    for (const from of [
      ReservationStatus.CANCELLED,
      ReservationStatus.REFUSED,
      ReservationStatus.COMPLETED,
    ]) {
      expect(
        thrown(() => transitions[ReservationStatus.CANCELLED](reach[from]())),
      ).toBeInstanceOf(InvalidStateTransitionException);
    }
  });

  it('cannot cancel COMPLETED, cannot confirm REFUSED', () => {
    expect(
      thrown(() =>
        transitions[ReservationStatus.CANCELLED](
          reach[ReservationStatus.COMPLETED](),
        ),
      ),
    ).toBeInstanceOf(InvalidStateTransitionException);
    expect(
      thrown(() =>
        transitions[ReservationStatus.CONFIRMED](
          reach[ReservationStatus.REFUSED](),
        ),
      ),
    ).toBeInstanceOf(InvalidStateTransitionException);
  });

  it('cancel CONFIRMED -> CANCELLED, isActive false', () => {
    const r = confirmed();
    r.cancel();
    expect(r.toSnapshot().status).toBe(ReservationStatus.CANCELLED);
    expect(r.isActive).toBe(false);
  });

  it('amend comment on CONFIRMED stays CONFIRMED', () => {
    const r = confirmed();
    r.amend({ comment: 'hi' }, room, now);
    expect(r.toSnapshot().status).toBe(ReservationStatus.CONFIRMED);
    expect(r.toSnapshot().comment).toBe('hi');
  });

  it('amend slot on CONFIRMED -> InvalidStateTransitionException, unchanged', () => {
    const r = confirmed();
    const e = thrown(() =>
      r.amend(
        { slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T11:00:00Z') },
        room,
        now,
      ),
    );
    expect(e).toBeInstanceOf(InvalidStateTransitionException);
    expect(r.toSnapshot().status).toBe(ReservationStatus.CONFIRMED);
    expect(r.toSnapshot().totalAmount).toBe(135);
  });

  it('amend slot on PENDING_PAYMENT keeps PENDING_PAYMENT, amount recomputed', () => {
    const r = make();
    r.amend(
      { slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T11:00:00Z') },
      room,
      now,
    );
    const s = r.toSnapshot();
    expect(s.status).toBe(ReservationStatus.PENDING_PAYMENT);
    expect(s.totalAmount).toBe(90);
  });

  it('amend slot to a start before now -> invalid, unchanged', () => {
    const r = make();
    const e = thrown(() =>
      r.amend(
        { slot: TimeSlot.of('2026-09-30T09:00:00Z', '2026-09-30T10:00:00Z') },
        room,
        now,
      ),
    );
    expect(e.kind).toBe('invalid');
    expect(e.code).toBe('VALIDATION_ERROR');
    expect(r.slot.startAt).toBe(slot.startAt);
  });

  it('amend comment on a reservation already started -> ok', () => {
    const r = make();
    r.amend({ comment: 'late' }, room, new Date('2026-11-02T10:00:00Z'));
    expect(r.toSnapshot().comment).toBe('late');
  });

  it('amend over capacity throws invalid', () => {
    expect(
      thrown(() => make().amend({ numberOfParticipants: 21 }, room, now)).kind,
    ).toBe('invalid');
  });

  it('amend on REFUSED throws conflict', () => {
    const r = make();
    r.reject();
    expect(thrown(() => r.amend({ comment: 'x' }, room, now)).kind).toBe(
      'conflict',
    );
  });

  it('snapshot round-trips', () => {
    const r = make({ numberOfParticipants: 5 });
    expect(Reservation.restore(r.toSnapshot()).toSnapshot()).toEqual(
      r.toSnapshot(),
    );
  });

  it('endAt earlier than stored startAt is rejected by TimeSlot', () => {
    const r = make();
    const e = thrown(() =>
      r.amend(
        { slot: TimeSlot.of(r.slot.startAt, '2026-11-02T08:00:00Z') },
        room,
        now,
      ),
    );
    expect(e.kind).toBe('invalid');
  });
});
