import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { DataSource, Logger, MoreThanOrEqual } from 'typeorm';
import { dataSourceOptions } from '../src/database/data-source.js';
import { AvailabilityEntity } from '../src/modules/rooms/infra/availability.entity.js';
import { RoomEntity } from '../src/modules/rooms/infra/room.entity.js';
import { UserEntity } from '../src/modules/users/infra/user.entity.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { createTestApp, resetDatabase } from './create-app.js';

class QueryCounter implements Logger {
  count = 0;

  logQuery(): void {
    this.count++;
  }

  logQueryError(): void {}

  logQuerySlow(): void {}

  logSchemaBuild(): void {}

  logMigration(): void {}

  log(): void {}
}

describe('N+1 vs query builder join (e2e)', () => {
  let app: INestApplication<App>;
  let counter: QueryCounter;
  let countingDataSource: DataSource;

  beforeAll(async () => {
    app = await createTestApp();
    counter = new QueryCounter();
    countingDataSource = new DataSource({
      ...dataSourceOptions,
      logger: counter,
      logging: true,
    });
    await countingDataSource.initialize();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    const seed = app.get(DataSource);
    const rooms = await seed.getRepository(RoomEntity).save(
      [5, 12, 20].map((capacity) => ({
        name: `Salle ${capacity}`,
        capacity,
        location: 'Paris',
        pricePerHour: 30,
        ownerId: userFixture.id,
      })),
    );
    await seed.getRepository(AvailabilityEntity).insert(
      rooms.flatMap((room) => [
        {
          roomId: room.id,
          startTime: new Date('2026-11-02T09:00:00Z'),
          endTime: new Date('2026-11-02T12:00:00Z'),
        },
        {
          roomId: room.id,
          startTime: new Date('2026-11-03T09:00:00Z'),
          endTime: new Date('2026-11-03T12:00:00Z'),
        },
      ]),
    );
  });

  afterAll(async () => {
    await countingDataSource.destroy();
    await app.close();
  });

  it('lazy loading issues 1 + 2 queries per room', async () => {
    const repo = countingDataSource.getRepository(RoomEntity);
    counter.count = 0;

    const rooms = await repo.find({
      where: { capacity: MoreThanOrEqual(10) },
    });
    const lazy = [];
    for (const room of rooms) {
      const availabilities = await countingDataSource
        .getRepository(AvailabilityEntity)
        .find({ where: { roomId: room.id } });
      const owner = await countingDataSource
        .getRepository(UserEntity)
        .findOneBy({ id: room.ownerId });
      lazy.push({
        id: room.id,
        availabilities: availabilities.length,
        owner: owner?.id,
      });
    }

    expect(counter.count).toBe(5);
    expect(lazy).toHaveLength(2);
    lazy.sort((a, b) => a.id.localeCompare(b.id));
    expect(lazy.every((r) => r.availabilities === 2)).toBe(true);
  });

  it('query builder join issues a single query', async () => {
    counter.count = 0;

    const rooms = await countingDataSource
      .createQueryBuilder(RoomEntity, 'room')
      .leftJoinAndSelect('room.availabilities', 'availability')
      .leftJoinAndSelect('room.owner', 'owner')
      .where('room.capacity >= :minCapacity', { minCapacity: 10 })
      .getMany();

    expect(counter.count).toBe(1);
    expect(rooms).toHaveLength(2);
    expect(rooms.every((r) => r.availabilities.length === 2)).toBe(true);
    expect(rooms.every((r) => r.owner.id === userFixture.id)).toBe(true);
  });

  it('lazy and join return the same rooms and availability counts', async () => {
    const lazyRooms = await countingDataSource.getRepository(RoomEntity).find({
      where: { capacity: MoreThanOrEqual(10) },
    });
    const lazy = await Promise.all(
      lazyRooms.map(async (room) => ({
        id: room.id,
        availabilities: await countingDataSource
          .getRepository(AvailabilityEntity)
          .countBy({ roomId: room.id }),
      })),
    );

    const joined = await countingDataSource
      .createQueryBuilder(RoomEntity, 'room')
      .leftJoinAndSelect('room.availabilities', 'availability')
      .where('room.capacity >= :minCapacity', { minCapacity: 10 })
      .getMany();
    const eager = joined.map((room) => ({
      id: room.id,
      availabilities: room.availabilities.length,
    }));

    const byId = (a: { id: string }, b: { id: string }) =>
      a.id.localeCompare(b.id);
    expect([...eager].sort(byId)).toEqual([...lazy].sort(byId));
  });
});
