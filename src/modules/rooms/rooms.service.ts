import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';
import { DomainError } from '../../common/domain-error.js';
import { MESSAGES } from '../../common/http/api-exception.filter.js';
import type {
  AvailabilitySlot,
  AvailabilityUpdateRequest,
  PaginatedRooms,
  Room,
  RoomCreateRequest,
  RoomStatus,
  RoomUpdateRequest,
} from '../../contract.js';
import { userFixture } from '../auth/fixtures/user.fixture.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { RoomEntity } from './infra/room.entity.js';

const FK_VIOLATION = '23503';

const notFound = () => new DomainError('not_found', 'NOT_FOUND', MESSAGES[404]);

const AVAILABILITY_SQL = `
SELECT to_char(a.start_time AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS "startTime",
       to_char(a.end_time AT TIME ZONE 'Europe/Paris', 'HH24:MI') AS "endTime",
       NOT EXISTS (
         SELECT 1 FROM reservations r
         WHERE r.room_id = a.room_id AND r.status IN ('PENDING','CONFIRMED')
           AND tstzrange(r.start_time, r.end_time) && tstzrange(a.start_time, a.end_time)
       ) AS "available"
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
  ) {}

  async list(q: ListRoomsQueryDto): Promise<PaginatedRooms> {
    const qb = this.rooms
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id')
      .skip((q.page - 1) * q.pageSize)
      .take(q.pageSize);
    // ponytail: availability filters ignored until search epic
    if (q.search)
      qb.andWhere('(r.name ILIKE :s OR r.description ILIKE :s)', {
        s: `%${q.search}%`,
      });
    if (q.location) qb.andWhere('r.location ILIKE :l', { l: q.location });
    if (q.capacityMin !== undefined)
      qb.andWhere('r.capacity >= :cmin', { cmin: q.capacityMin });
    if (q.capacityMax !== undefined)
      qb.andWhere('r.capacity <= :cmax', { cmax: q.capacityMax });
    const [items, total] = await qb.getManyAndCount();
    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map(toRoom),
    };
  }

  async create(body: RoomCreateRequest): Promise<Room> {
    // ponytail: until auth guard
    const saved = await this.rooms.save(
      this.rooms.create({
        ownerId: userFixture.id,
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

  async update(id: string, body: RoomUpdateRequest): Promise<Room> {
    const room = await this.load(id);
    Object.assign(room, body);
    return toRoom(await this.rooms.save(room));
  }

  async delete(id: string): Promise<void> {
    try {
      const { affected } = await this.rooms.delete(id);
      if (!affected) throw notFound();
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string }).code === FK_VIOLATION
      ) {
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
    body: AvailabilityUpdateRequest,
  ): Promise<AvailabilitySlot[]> {
    await this.load(roomId);
    await this.dataSource.transaction(async (tx) => {
      await tx.query(
        `DELETE FROM availabilities
         WHERE room_id = $1 AND (start_time AT TIME ZONE 'Europe/Paris')::date = $2::date`,
        [roomId, body.date],
      );
      // Unavailable slots are not stored: availability is computed on read.
      for (const s of body.slots.filter((s) => s.available)) {
        await tx.query(
          `INSERT INTO availabilities (room_id, start_time, end_time)
           VALUES ($1,
             ($2::date + $3::time) AT TIME ZONE 'Europe/Paris',
             ($2::date + $4::time) AT TIME ZONE 'Europe/Paris')`,
          [roomId, body.date, s.startTime, s.endTime],
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
}
