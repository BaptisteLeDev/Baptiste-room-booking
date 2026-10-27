import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPgCode } from '../../../common/database/pg-error.js';
import { DomainError } from '../../../common/domain-error.js';
import {
  Reservation,
  type ReservationSnapshot,
} from '../domain/reservation.js';
import type { ReservationRepository } from '../domain/reservation-repository.js';
import { RoomEntity } from '../../rooms/infra/room.entity.js';
import { TimeSlot } from '../domain/time-slot.js';
import { ReservationEntity } from './reservation.entity.js';

const EXCLUSION_VIOLATION = '23P01';

const toSnapshot = (e: ReservationEntity): ReservationSnapshot => ({
  id: e.id,
  roomId: e.roomId,
  userId: e.userId,
  startAt: e.startTime.toISOString(),
  endAt: e.endTime.toISOString(),
  status: e.status as ReservationSnapshot['status'],
  ...(e.numberOfParticipants !== null && {
    numberOfParticipants: e.numberOfParticipants,
  }),
  ...(e.comment !== null && { comment: e.comment }),
  totalAmount: e.totalAmount,
  currency: e.currency,
  createdAt: e.createdAt.toISOString(),
});

const fromSnapshot = (s: ReservationSnapshot): ReservationEntity =>
  Object.assign(new ReservationEntity(), {
    id: s.id,
    roomId: s.roomId,
    userId: s.userId,
    startTime: new Date(s.startAt),
    endTime: new Date(s.endAt),
    status: s.status,
    numberOfParticipants: s.numberOfParticipants ?? null,
    comment: s.comment ?? null,
    totalAmount: s.totalAmount,
    currency: s.currency,
    createdAt: new Date(s.createdAt),
  });

@Injectable()
export class TypeOrmReservationRepository implements ReservationRepository {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly rows: Repository<ReservationEntity>,
  ) {}

  async get(id: string): Promise<Reservation | undefined> {
    const row = await this.rows.findOneBy({ id });
    return row ? Reservation.restore(toSnapshot(row)) : undefined;
  }

  async save(r: Reservation): Promise<void> {
    try {
      await this.rows.save(fromSnapshot(r.toSnapshot()));
    } catch (e) {
      if (hasPgCode(e, EXCLUSION_VIOLATION)) {
        throw new DomainError(
          'conflict',
          'SLOT_UNAVAILABLE',
          "Ce créneau n'est plus disponible.",
        );
      }
      throw e;
    }
  }

  // ponytail: full scan, push filters into SQL when volume grows
  async list(): Promise<Reservation[]> {
    const rows = await this.rows.find();
    return rows.map((row) => Reservation.restore(toSnapshot(row)));
  }

  async findOverlapping(
    roomId: string,
    slot: TimeSlot,
    excludeId?: string,
  ): Promise<Reservation | undefined> {
    const q = this.rows
      .createQueryBuilder('res')
      .where('res.roomId = :roomId', { roomId })
      .andWhere('res.status IN (:...active)', {
        active: ['PENDING', 'CONFIRMED'],
      })
      .andWhere('res.startTime < :endAt AND res.endTime > :startAt', {
        startAt: new Date(slot.startAt),
        endAt: new Date(slot.endAt),
      });
    if (excludeId) q.andWhere('res.id != :excludeId', { excludeId });
    const row = await q.getOne();
    return row ? Reservation.restore(toSnapshot(row)) : undefined;
  }

  // Locking reservation rows misses phantom inserts, so lock the room row.
  exclusive<T>(
    roomId: string,
    work: (tx: ReservationRepository) => Promise<T>,
  ): Promise<T> {
    return this.rows.manager.transaction(async (m) => {
      await m
        .createQueryBuilder(RoomEntity, 'room')
        .setLock('pessimistic_write')
        .where('room.id = :roomId', { roomId })
        .getOne();
      return work(
        new TypeOrmReservationRepository(m.getRepository(ReservationEntity)),
      );
    });
  }
}
