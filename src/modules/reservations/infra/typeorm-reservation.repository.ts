import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import type { ReservationStatus } from '../domain/enums/reservation-status.enum.js';
import {
  slotUnavailable,
  statusConflict,
} from '../domain/exceptions/invalid-state-transition.exception.js';
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

  async save(r: Reservation, loadedStatus?: ReservationStatus): Promise<void> {
    try {
      const e = toEntity(r.toSnapshot());
      if (loadedStatus === undefined) {
        await this.rows.save(e);
      } else {
        const { id, ...fields } = e;
        const res = await this.rows.update(
          { id, status: loadedStatus },
          fields,
        );
        if (res.affected === 0) {
          throw statusConflict();
        }
      }
    } catch (e) {
      if (hasPgCode(e, PgCode.EXCLUSION_VIOLATION)) {
        throw slotUnavailable();
      }
      throw e;
    }
  }

  async isOpen(roomId: string, slot: TimeSlot): Promise<boolean> {
    const [row] = await this.rows.query<{ open: boolean }[]>(
      `SELECT COALESCE(range_agg(tstzrange(start_time, end_time)) FILTER (WHERE available) @> tstzrange($2, $3), false)
         AND NOT COALESCE(bool_or(NOT available), false) AS open
       FROM availabilities
       WHERE room_id = $1 AND start_time < $3 AND end_time > $2`,
      [roomId, slot.startAt, slot.endAt],
    );
    return row.open;
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
