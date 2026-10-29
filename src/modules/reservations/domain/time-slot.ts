import { DomainError } from '../../../common/domain-error.js';

const MINUTE_MS = 60_000;

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

  minutes(): number {
    return (this.endMs - this.startMs) / MINUTE_MS;
  }

  overlaps(o: TimeSlot): boolean {
    return this.startMs < o.endMs && o.startMs < this.endMs;
  }

  equals(o: TimeSlot): boolean {
    return this.startMs === o.startMs && this.endMs === o.endMs;
  }
}
