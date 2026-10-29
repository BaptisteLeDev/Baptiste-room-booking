import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../../common/database/paginate.js';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import { DomainError } from '../../../common/domain-error.js';
import type { ReservationStatus } from '../domain/enums/reservation-status.enum.js';
import { statusConflict } from '../domain/exceptions/invalid-state-transition.exception.js';
import type { Reservation } from '../domain/reservation.js';
import type {
  ReservationFilter,
  ReservationRepository,
} from '../domain/reservation-repository.js';
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
        throw new DomainError(
          'conflict',
          'SLOT_UNAVAILABLE',
          "Ce créneau n'est plus disponible.",
        );
      }
      throw e;
    }
  }

  async search(
    f: ReservationFilter,
  ): Promise<{ items: Reservation[]; total: number }> {
    const qb = this.rows
      .createQueryBuilder('res')
      .where('res.userId = :userId', { userId: f.userId })
      .orderBy('res.startTime', 'ASC')
      .addOrderBy('res.id', 'ASC');
    if (f.status) qb.andWhere('res.status = :status', { status: f.status });
    // Day bounds are UTC, as the list has always been (startAt is UTC ISO).
    if (f.from)
      qb.andWhere(
        "CAST(res.startTime AT TIME ZONE 'UTC' AS date) >= CAST(:from AS date)",
        { from: f.from },
      );
    if (f.to)
      qb.andWhere(
        "CAST(res.startTime AT TIME ZONE 'UTC' AS date) <= CAST(:to AS date)",
        { to: f.to },
      );
    const { items, total } = await paginate(qb, f.page, f.pageSize);
    return { items: items.map(toReservation), total };
  }

  async findByRooms(
    roomIds: readonly string[],
    status?: ReservationStatus,
  ): Promise<Reservation[]> {
    const qb = this.rows
      .createQueryBuilder('res')
      .where('res.roomId IN (:...roomIds)', { roomIds })
      .orderBy('res.startTime', 'ASC')
      .addOrderBy('res.id', 'ASC');
    if (status) qb.andWhere('res.status = :status', { status });
    return (await qb.getMany()).map(toReservation);
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
