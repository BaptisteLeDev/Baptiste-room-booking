import { DomainError } from '../../../common/domain-error.js';

const HOUR_MS = 3_600_000;

export class TimeSlot {
  private constructor(
    readonly startAt: string,
    readonly endAt: string,
    private readonly startMs: number,
    private readonly endMs: number,
  ) {}

  static of(startAt: string, endAt: string): TimeSlot {
    const startMs = Date.parse(startAt);
    const endMs = Date.parse(endAt);
    if (!(startMs < endMs)) {
      throw new DomainError(
        'invalid',
        'VALIDATION_ERROR',
        'Le début doit précéder la fin.',
      );
    }
    return new TimeSlot(
      new Date(startMs).toISOString(),
      new Date(endMs).toISOString(),
      startMs,
      endMs,
    );
  }

  hours(): number {
    return (this.endMs - this.startMs) / HOUR_MS;
  }

  overlaps(o: TimeSlot): boolean {
    return this.startMs < o.endMs && o.startMs < this.endMs;
  }

  equals(o: TimeSlot): boolean {
    return this.startMs === o.startMs && this.endMs === o.endMs;
  }
}
