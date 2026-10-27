import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../common/domain-error.js';
import { TimeSlot } from './time-slot.js';

const s = (a: string, b: string) =>
  TimeSlot.of(`2026-11-02T${a}:00:00Z`, `2026-11-02T${b}:00:00Z`);

describe('TimeSlot', () => {
  it('computes hours', () => {
    expect(s('09', '12').hours()).toBe(3);
  });

  it('normalises bounds to ISO with milliseconds', () => {
    const t = s('09', '10');
    expect(t.startAt).toBe('2026-11-02T09:00:00.000Z');
    expect(t.endAt).toBe('2026-11-02T10:00:00.000Z');
  });

  it.each([
    ['start == end', () => s('09', '09')],
    ['end < start', () => s('10', '09')],
    ['garbage', () => TimeSlot.of('garbage', '2026-11-02T10:00:00Z')],
  ])('rejects %s', (_n, fn) => {
    expect(fn).toThrow(DomainError);
    try {
      fn();
    } catch (e) {
      expect((e as DomainError).kind).toBe('invalid');
      expect((e as DomainError).code).toBe('VALIDATION_ERROR');
    }
  });

  it('adjacent slots do not overlap', () => {
    expect(s('09', '10').overlaps(s('10', '11'))).toBe(false);
    expect(s('10', '11').overlaps(s('09', '10'))).toBe(false);
  });

  it('overlapping slots overlap', () => {
    expect(s('09', '11').overlaps(s('10', '12'))).toBe(true);
  });

  it('equals compares instants', () => {
    expect(s('09', '10').equals(s('09', '10'))).toBe(true);
    expect(s('09', '10').equals(s('09', '11'))).toBe(false);
  });
});
