import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../common/domain-error.js';
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

const thrown = (fn: () => void): DomainError => {
  try {
    fn();
  } catch (e) {
    return e as DomainError;
  }
  throw new Error('did not throw');
};

describe('Reservation', () => {
  it('request -> PENDING with computed amount', () => {
    const s = make().toSnapshot();
    expect(s.status).toBe('PENDING');
    expect(s.totalAmount).toBe(135);
    expect(s.createdAt).toBe(now.toISOString());
  });

  it('rejects participants over capacity', () => {
    const e = thrown(() => make({ numberOfParticipants: 21 }));
    expect(e.kind).toBe('invalid');
    expect(e.code).toBe('VALIDATION_ERROR');
  });

  it('confirm PENDING -> CONFIRMED, twice -> conflict', () => {
    const r = confirmed();
    expect(r.toSnapshot().status).toBe('CONFIRMED');
    const e = thrown(() => r.confirm());
    expect(e.kind).toBe('conflict');
    expect(e.code).toBe('RESERVATION_STATUS_CONFLICT');
  });

  it('reject CONFIRMED throws conflict', () => {
    expect(thrown(() => confirmed().reject()).kind).toBe('conflict');
  });

  it('cancel CONFIRMED -> CANCELLED, again throws', () => {
    const r = confirmed();
    r.cancel();
    expect(r.toSnapshot().status).toBe('CANCELLED');
    expect(r.isActive).toBe(false);
    expect(thrown(() => r.cancel()).kind).toBe('conflict');
  });

  it('amend comment on CONFIRMED stays CONFIRMED', () => {
    const r = confirmed();
    r.amend({ comment: 'hi' }, room);
    expect(r.toSnapshot().status).toBe('CONFIRMED');
    expect(r.toSnapshot().comment).toBe('hi');
  });

  it('amend slot on CONFIRMED -> PENDING, amount recomputed', () => {
    const r = confirmed();
    r.amend(
      { slot: TimeSlot.of('2026-11-02T09:00:00Z', '2026-11-02T11:00:00Z') },
      room,
    );
    const s = r.toSnapshot();
    expect(s.status).toBe('PENDING');
    expect(s.totalAmount).toBe(90);
  });

  it('amend over capacity throws invalid', () => {
    expect(
      thrown(() => make().amend({ numberOfParticipants: 21 }, room)).kind,
    ).toBe('invalid');
  });

  it('amend on REJECTED throws conflict', () => {
    const r = make();
    r.reject();
    expect(thrown(() => r.amend({ comment: 'x' }, room)).kind).toBe('conflict');
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
      ),
    );
    expect(e.kind).toBe('invalid');
  });
});
