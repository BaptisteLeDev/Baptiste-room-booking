import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { hasPgCode } from '../../common/database/pg-error.js';
import { DomainError } from '../../common/domain-error.js';
import { notFound } from '../../common/not-found.js';
import type {
  AvailabilitySlot,
  AvailabilityUpdateRequest,
  PaginatedRooms,
  Room,
  RoomCreateRequest,
  RoomStatus,
  RoomUpdateRequest,
} from '../../contract.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { RoomEntity } from './infra/room.entity.js';

const FK_VIOLATION = '23503';

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

function toRoom(e: RoomEntity): Room {
  return {
    id: e.id,
    name: e.name,
    ...(e.description !== null && { description: e.description }),
    capacity: e.capacity,
    location: e.location,
    equipment: e.equipment,
    pricePerHour: e.pricePerHour,
    status: e.status as RoomStatus,
    ownerId: e.ownerId,
    ...(e.imageUrl !== null && { imageUrl: e.imageUrl }),
    createdAt: e.createdAt.toISOString(),
  };
}

@Injectable()
export class RoomsService {
  constructor(
    @InjectRepository(RoomEntity)
    private readonly rooms: Repository<RoomEntity>,
    private readonly dataSource: DataSource,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(q: ListRoomsQueryDto): Promise<PaginatedRooms> {
    const qb = this.rooms
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize);
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
    const [items, total] = await qb.getManyAndCount();
    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map(toRoom),
    };
  }

  async create(userId: string, body: RoomCreateRequest): Promise<Room> {
    await this.authorization.assertManager(userId);
    const saved = await this.rooms.save(
      this.rooms.create({
        ownerId: userId,
        name: body.name,
        description: body.description ?? null,
        capacity: body.capacity,
        location: body.location,
        equipment: body.equipment ?? [],
        pricePerHour: body.pricePerHour,
        status: 'ACTIVE',
        imageUrl: body.imageUrl ?? null,
      }),
    );
    return toRoom(saved);
  }

  async get(id: string): Promise<Room> {
    return toRoom(await this.load(id));
  }

  async update(
    id: string,
    userId: string,
    body: RoomUpdateRequest,
  ): Promise<Room> {
    const room = await this.loadManaged(id, userId);
    Object.assign(
      room,
      Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== undefined),
      ),
    );
    return toRoom(await this.rooms.save(room));
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.loadManaged(id, userId);
    try {
      await this.rooms.delete(id);
    } catch (e) {
      if (hasPgCode(e, FK_VIOLATION)) {
        throw new DomainError(
          'conflict',
          'ROOM_HAS_RESERVATIONS',
          'La salle a des réservations.',
        );
      }
      throw e;
    }
  }

  async getAvailability(
    roomId: string,
    q: { date: string; startTime?: string; endTime?: string },
  ): Promise<AvailabilitySlot[]> {
    await this.load(roomId);
    return this.dataSource.query<AvailabilitySlot[]>(AVAILABILITY_SQL, [
      roomId,
      q.date,
      q.startTime ?? null,
      q.endTime ?? null,
    ]);
  }

  async setAvailability(
    roomId: string,
    userId: string,
    body: AvailabilityUpdateRequest,
  ): Promise<AvailabilitySlot[]> {
    await this.loadManaged(roomId, userId);
    await this.dataSource.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM availabilities
         WHERE room_id = $1 AND (start_time AT TIME ZONE 'Europe/Paris')::date = $2::date`,
        [roomId, body.date],
      );
      for (const s of body.slots) {
        await tx.query(
          `INSERT INTO availabilities (room_id, start_time, end_time, available)
           VALUES ($1,
             ($2::date + $3::time) AT TIME ZONE 'Europe/Paris',
             ($2::date + $4::time) AT TIME ZONE 'Europe/Paris',
             $5)`,
          [roomId, body.date, s.startTime, s.endTime, s.available],
        );
      }
    });
    return this.getAvailability(roomId, { date: body.date });
  }

  private async load(id: string): Promise<RoomEntity> {
    const room = await this.rooms.findOneBy({ id });
    if (!room) throw notFound();
    return room;
  }

  private async loadManaged(id: string, userId: string): Promise<RoomEntity> {
    const room = await this.load(id);
    await this.authorization.assertOwnerOrAdmin(userId, room.ownerId);
    return room;
  }
}
