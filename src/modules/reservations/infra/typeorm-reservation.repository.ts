import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import { DomainError } from '../../../common/domain-error.js';
import type { Reservation } from '../domain/reservation.js';
import type { ReservationRepository } from '../domain/reservation-repository.js';
import { TimeSlot } from '../domain/time-slot.js';
import { ReservationEntity } from './reservation.entity.js';
import { toEntity, toReservation } from './reservation.mapper.js';
import { RoomRow } from './room-row.entity.js';

@Injectable()
export class TypeOrmReservationRepository implements ReservationRepository {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly rows: Repository<ReservationEntity>,
  ) {}

  async get(id: string): Promise<Reservation | undefined> {
    const row = await this.rows.findOneBy({ id });
    return row ? toReservation(row) : undefined;
  }

  async save(r: Reservation): Promise<void> {
    try {
      await this.rows.save(toEntity(r.toSnapshot()));
    } catch (e) {
      if (hasPgCode(e, PgCode.EXCLUSION_VIOLATION)) {
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
    return rows.map(toReservation);
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
        active: ['PENDING_PAYMENT', 'CONFIRMED'],
      })
      .andWhere('res.startTime < :endAt AND res.endTime > :startAt', {
        startAt: new Date(slot.startAt),
        endAt: new Date(slot.endAt),
      });
    if (excludeId) q.andWhere('res.id != :excludeId', { excludeId });
    const row = await q.getOne();
    return row ? toReservation(row) : undefined;
  }

  // Locking reservation rows misses phantom inserts, so lock the room row.
  exclusive<T>(
    roomId: string,
    work: (tx: ReservationRepository) => Promise<T>,
  ): Promise<T> {
    return this.rows.manager.transaction(async (m) => {
      await m
        .createQueryBuilder(RoomRow, 'room')
        .setLock('pessimistic_write')
        .where('room.id = :roomId', { roomId })
        .getOne();
      return work(
        new TypeOrmReservationRepository(m.getRepository(ReservationEntity)),
      );
    });
  }
}
