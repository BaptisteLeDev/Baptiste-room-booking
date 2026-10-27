import { DomainError } from '../../../common/domain-error.js';
import { TimeSlot } from './time-slot.js';

export type ReservationStatus =
  'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';

export type RoomTerms = { capacity: number; pricePerHour: number };

export type ReservationSnapshot = {
  id: string;
  roomId: string;
  userId: string;
  startAt: string;
  endAt: string;
  status: ReservationStatus;
  numberOfParticipants?: number;
  comment?: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const assertCapacity = (n: number | undefined, room: RoomTerms) => {
  if (n !== undefined && n > room.capacity) {
    throw new DomainError(
      'invalid',
      'VALIDATION_ERROR',
      'Le nombre de participants dépasse la capacité de la salle.',
    );
  }
};

export class Reservation {
  private constructor(
    private readonly s: Omit<ReservationSnapshot, 'startAt' | 'endAt'>,
    private _slot: TimeSlot,
  ) {}

  static request(p: {
    id: string;
    roomId: string;
    userId: string;
    slot: TimeSlot;
    numberOfParticipants?: number;
    comment?: string;
    room: RoomTerms;
    currency: string;
    now: Date;
  }): Reservation {
    assertCapacity(p.numberOfParticipants, p.room);
    return new Reservation(
      {
        id: p.id,
        roomId: p.roomId,
        userId: p.userId,
        status: 'PENDING',
        ...(p.numberOfParticipants !== undefined && {
          numberOfParticipants: p.numberOfParticipants,
        }),
        ...(p.comment !== undefined && { comment: p.comment }),
        totalAmount: round2(p.room.pricePerHour * p.slot.hours()),
        currency: p.currency,
        createdAt: p.now.toISOString(),
      },
      p.slot,
    );
  }

  static restore(s: ReservationSnapshot): Reservation {
    const { startAt, endAt, ...rest } = s;
    return new Reservation(rest, TimeSlot.of(startAt, endAt));
  }

  get id(): string {
    return this.s.id;
  }

  get roomId(): string {
    return this.s.roomId;
  }

  get slot(): TimeSlot {
    return this._slot;
  }

  get isActive(): boolean {
    return this.s.status === 'PENDING' || this.s.status === 'CONFIRMED';
  }

  confirm(): void {
    this.#assertStatus('PENDING');
    this.s.status = 'CONFIRMED';
  }

  reject(): void {
    this.#assertStatus('PENDING');
    this.s.status = 'REJECTED';
  }

  cancel(): void {
    this.#assertStatus('PENDING', 'CONFIRMED');
    this.s.status = 'CANCELLED';
  }

  amend(
    c: { slot?: TimeSlot; numberOfParticipants?: number; comment?: string },
    room: RoomTerms,
  ): void {
    this.#assertStatus('PENDING', 'CONFIRMED');
    const participants = c.numberOfParticipants ?? this.s.numberOfParticipants;
    assertCapacity(participants, room);
    if (participants !== undefined) this.s.numberOfParticipants = participants;
    if (c.comment !== undefined) this.s.comment = c.comment;
    if (c.slot && !c.slot.equals(this._slot)) {
      this._slot = c.slot;
      this.s.totalAmount = round2(room.pricePerHour * c.slot.hours());
      this.s.status = 'PENDING';
    }
  }

  toSnapshot(): ReservationSnapshot {
    return {
      ...this.s,
      startAt: this._slot.startAt,
      endAt: this._slot.endAt,
    };
  }

  #assertStatus(...allowed: ReservationStatus[]): void {
    if (!allowed.includes(this.s.status)) {
      throw new DomainError(
        'conflict',
        'RESERVATION_STATUS_CONFLICT',
        'Statut de la réservation incompatible.',
      );
    }
  }
}
