import { DomainError } from '../../../common/domain-error.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { InvalidStateTransitionException } from './exceptions/invalid-state-transition.exception.js';
import { TimeSlot } from './time-slot.js';

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.PENDING_PAYMENT]: [
    ReservationStatus.CONFIRMED,
    ReservationStatus.REFUSED,
    ReservationStatus.CANCELLED,
  ],
  [ReservationStatus.CONFIRMED]: [
    ReservationStatus.CANCELLED,
    ReservationStatus.COMPLETED,
  ],
  [ReservationStatus.CANCELLED]: [],
  [ReservationStatus.REFUSED]: [],
  [ReservationStatus.COMPLETED]: [],
};

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
        status: ReservationStatus.PENDING_PAYMENT,
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
    return (
      this.s.status === ReservationStatus.PENDING_PAYMENT ||
      this.s.status === ReservationStatus.CONFIRMED
    );
  }

  confirm(): void {
    this.#transitionTo(ReservationStatus.CONFIRMED);
  }

  reject(): void {
    this.#transitionTo(ReservationStatus.REFUSED);
  }

  cancel(): void {
    this.#transitionTo(ReservationStatus.CANCELLED);
  }

  complete(): void {
    this.#transitionTo(ReservationStatus.COMPLETED);
  }

  amend(
    c: { slot?: TimeSlot; numberOfParticipants?: number; comment?: string },
    room: RoomTerms,
  ): void {
    this.#assertEditable();
    const participants = c.numberOfParticipants ?? this.s.numberOfParticipants;
    assertCapacity(participants, room);
    const slotChanged = c.slot !== undefined && !c.slot.equals(this._slot);
    if (slotChanged && this.s.status !== ReservationStatus.PENDING_PAYMENT) {
      throw new InvalidStateTransitionException(
        this.s.status,
        ReservationStatus.PENDING_PAYMENT,
      );
    }
    if (participants !== undefined) this.s.numberOfParticipants = participants;
    if (c.comment !== undefined) this.s.comment = c.comment;
    if (c.slot && slotChanged) {
      this._slot = c.slot;
      this.s.totalAmount = round2(room.pricePerHour * c.slot.hours());
    }
  }

  toSnapshot(): ReservationSnapshot {
    return {
      ...this.s,
      startAt: this._slot.startAt,
      endAt: this._slot.endAt,
    };
  }

  #transitionTo(to: ReservationStatus): void {
    if (!TRANSITIONS[this.s.status].includes(to)) {
      throw new InvalidStateTransitionException(this.s.status, to);
    }
    this.s.status = to;
  }

  #assertEditable(): void {
    if (
      this.s.status !== ReservationStatus.PENDING_PAYMENT &&
      this.s.status !== ReservationStatus.CONFIRMED
    ) {
      throw new DomainError(
        'conflict',
        'RESERVATION_STATUS_CONFLICT',
        'Statut de la réservation incompatible.',
      );
    }
  }
}
