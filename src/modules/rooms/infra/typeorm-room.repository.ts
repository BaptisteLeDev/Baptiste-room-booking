import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../../common/database/paginate.js';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import { DomainError } from '../../../common/domain-error.js';
import type { Room } from '../domain/entities/room.entity.js';
import type {
  AvailabilityQuery,
  AvailabilitySlot,
  IRoomRepository,
  RoomListFilter,
  RoomPage,
} from '../domain/repositories/room.repository.interface.js';
import { RoomEntity } from './room.entity.js';
import { toEntity, toRoom } from './room.mapper.js';

// availability slot `a` is open and no active reservation overlaps it
const SLOT_OPEN = `(a.available AND NOT EXISTS (
  SELECT 1 FROM reservations res
  WHERE res.room_id = a.room_id AND res.status IN ('PENDING','CONFIRMED')
    AND tstzrange(res.start_time, res.end_time) && tstzrange(a.start_time, a.end_time)
))`;

const AVAILABILITY_SQL = `
SELECT to_char(a.start_time AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS "startTime",
       to_char(a.end_time AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS "endTime",
       ${SLOT_OPEN} AS "available"
FROM availabilities a
WHERE a.room_id = $1
  AND (a.start_time AT TIME ZONE 'Europe/Paris')::date = $2::date
  AND ($3::time IS NULL OR (a.end_time AT TIME ZONE 'Europe/Paris')::time > $3::time)
  AND ($4::time IS NULL OR (a.start_time AT TIME ZONE 'Europe/Paris')::time < $4::time)
ORDER BY a.start_time`;

@Injectable()
export class TypeOrmRoomRepository implements IRoomRepository {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly rows: Repository<RoomEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async save(room: Room): Promise<Room> {
    return toRoom(await this.rows.save(toEntity(room.toSnapshot())));
  }

  async findById(id: string): Promise<Room | null> {
    const row = await this.rows.findOneBy({ id });
    return row ? toRoom(row) : null;
  }

  async findAll(q: RoomListFilter): Promise<RoomPage> {
    const qb = this.rows
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id');
    if (q.search)
      qb.andWhere('(r.name ILIKE :s OR r.description ILIKE :s)', {
        s: `%${q.search}%`,
      });
    if (q.location) qb.andWhere('r.location ILIKE :l', { l: q.location });
    if (q.capacityMin !== undefined)
      qb.andWhere('r.capacity >= :cmin', { cmin: q.capacityMin });
    if (q.capacityMax !== undefined)
      qb.andWhere('r.capacity <= :cmax', { cmax: q.capacityMax });
    if (q.date) {
      const availabilityFilters = [
        `a.room_id = r.id`,
        `(a.start_time AT TIME ZONE 'Europe/Paris')::date = CAST(:availabilityDate AS date)`,
      ];
      if (q.startTime) {
        availabilityFilters.push(
          `(a.end_time AT TIME ZONE 'Europe/Paris')::time > CAST(:availabilityStart AS time)`,
        );
      }
      if (q.endTime) {
        availabilityFilters.push(
          `(a.start_time AT TIME ZONE 'Europe/Paris')::time < CAST(:availabilityEnd AS time)`,
        );
      }
      if (q.available !== undefined) {
        availabilityFilters.push(`${SLOT_OPEN} = :availabilityAvailable`);
      }
      qb.andWhere(
        `EXISTS (
        SELECT 1
        FROM availabilities a
        WHERE ${availabilityFilters.join(' AND ')}
      )`,
        {
          availabilityDate: q.date,
          ...(q.startTime && { availabilityStart: q.startTime }),
          ...(q.endTime && { availabilityEnd: q.endTime }),
          ...(q.available !== undefined && {
            availabilityAvailable: q.available,
          }),
        },
      );
    }
    const { items, total } = await paginate(qb, q.page, q.pageSize);
    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map(toRoom),
    };
  }

  async delete(id: string): Promise<void> {
    try {
      await this.rows.delete(id);
    } catch (e) {
      if (hasPgCode(e, PgCode.FK_VIOLATION)) {
        throw new DomainError(
          'conflict',
          'ROOM_HAS_RESERVATIONS',
          'La salle a des réservations.',
        );
      }
      throw e;
    }
  }

  async findAvailability(
    roomId: string,
    q: AvailabilityQuery,
  ): Promise<AvailabilitySlot[]> {
    return this.dataSource.query<AvailabilitySlot[]>(AVAILABILITY_SQL, [
      roomId,
      q.date,
      q.startTime ?? null,
      q.endTime ?? null,
    ]);
  }

  async replaceAvailability(
    roomId: string,
    date: string,
    slots: AvailabilitySlot[],
  ): Promise<void> {
    await this.dataSource.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM availabilities
         WHERE room_id = $1 AND (start_time AT TIME ZONE 'Europe/Paris')::date = $2::date`,
        [roomId, date],
      );
      for (const s of slots) {
        await tx.query(
          `INSERT INTO availabilities (room_id, start_time, end_time, available)
           VALUES ($1,
             ($2::date + $3::time) AT TIME ZONE 'Europe/Paris',
             ($2::date + $4::time) AT TIME ZONE 'Europe/Paris',
             $5)`,
          [roomId, date, s.startTime, s.endTime, s.available],
        );
      }
    });
  }
}
