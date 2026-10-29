import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AvailabilityEntity } from '../src/modules/rooms/infra/availability.entity.js';
import { RoomEntity } from '../src/modules/rooms/infra/room.entity.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { createTestApp, resetDatabase, loginAs } from './create-app.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

type GqlBody = {
  data?: Record<string, unknown> | null;
  errors?: { message: string; extensions: { code: string; status: number } }[];
};

const gql = (
  app: INestApplication<App>,
  token: string | undefined,
  query: string,
  variables?: Record<string, unknown>,
) => {
  const req = request(app.getHttpServer()).post('/graphql');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.send({ query, variables });
};

const body = (res: { body: unknown }) => res.body as GqlBody;

describe('GraphQL read API (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;
  let seed: DataSource;

  const saveRoom = (overrides: Partial<RoomEntity> = {}) =>
    seed.getRepository(RoomEntity).save({
      name: 'Salle Paris',
      capacity: 20,
      location: 'Paris',
      pricePerHour: 35,
      ownerId: userFixture.id,
      ...overrides,
    });

  beforeAll(async () => {
    app = await createTestApp();
    seed = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await loginAs(app, undefined, 'GESTIONNAIRE');
  });

  afterAll(async () => {
    await app.close();
  });

  describe('room(id)', () => {
    const ROOM = 'query ($id: ID!) { room(id: $id) { name capacity } }';

    it('room returns the requested fields only', async () => {
      const room = await saveRoom();
      const res = await gql(app, token, ROOM, { id: room.id }).expect(200);
      expect(body(res).errors).toBeUndefined();
      expect(body(res).data?.room).toEqual({
        name: 'Salle Paris',
        capacity: 20,
      });
    });

    it('room without token is unauthorized', async () => {
      const room = await saveRoom();
      const res = await gql(app, undefined, ROOM, { id: room.id }).expect(200);
      expect(body(res).data).toBeNull();
      expect(body(res).errors?.[0].extensions).toMatchObject({
        code: 'UNAUTHORIZED',
        status: 401,
      });
    });

    it('room with unknown id is not found', async () => {
      const res = await gql(app, token, ROOM, { id: UNKNOWN_ID }).expect(200);
      expect(body(res).errors?.[0].extensions.code).toBe('NOT_FOUND');
    });

    it('room with malformed id is a validation error', async () => {
      const res = await gql(app, token, ROOM, { id: 'abc' }).expect(200);
      expect(body(res).errors?.[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('searchRooms(filter)', () => {
    const SEARCH =
      'query ($filter: RoomSearchInput) { searchRooms(filter: $filter) { name } }';

    beforeEach(async () => {
      for (const [capacity, pricePerHour] of [
        [5, 20],
        [12, 30],
        [20, 80],
      ])
        await saveRoom({ name: `Salle ${capacity}`, capacity, pricePerHour });
    });

    it('searchRooms filters by capacity and price', async () => {
      const res = await gql(app, token, SEARCH, {
        filter: { minCapacity: 10, maxPricePerHour: 50 },
      }).expect(200);
      expect(body(res).errors).toBeUndefined();
      expect(body(res).data?.searchRooms).toEqual([{ name: 'Salle 12' }]);
    });

    it('searchRooms without filter lists all', async () => {
      const res = await gql(app, token, SEARCH).expect(200);
      expect(body(res).data?.searchRooms).toHaveLength(3);
    });

    it('searchRooms rejects pageSize over 100', async () => {
      const res = await gql(app, token, SEARCH, {
        filter: { pageSize: 101 },
      }).expect(200);
      expect(body(res).errors?.[0].extensions.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Room.availabilities', () => {
    const DAYS = ['2020-01-01', '2099-11-03', '2099-11-02'];
    let roomIds: string[];

    beforeEach(async () => {
      roomIds = [];
      for (const capacity of [5, 12, 20]) {
        const room = await saveRoom({ name: `Salle ${capacity}`, capacity });
        roomIds.push(room.id);
        await seed.getRepository(AvailabilityEntity).insert(
          DAYS.map((day) => ({
            roomId: room.id,
            startTime: new Date(`${day}T09:00:00Z`),
            endTime: new Date(`${day}T12:00:00Z`),
          })),
        );
      }
    });

    it('availabilities lists upcoming periods only', async () => {
      const res = await gql(
        app,
        token,
        'query ($id: ID!) { room(id: $id) { availabilities { startAt } } }',
        { id: roomIds[0] },
      ).expect(200);
      expect(body(res).errors).toBeUndefined();
      expect(body(res).data?.room).toEqual({
        availabilities: [
          { startAt: '2099-11-02T09:00:00.000Z' },
          { startAt: '2099-11-03T09:00:00.000Z' },
        ],
      });
    });

    it('searchRooms with availabilities runs one availability query', async () => {
      const logQuery = vi.spyOn(seed.logger, 'logQuery');
      const res = await gql(
        app,
        token,
        '{ searchRooms { availabilities { startAt } } }',
      ).expect(200);
      const sql = logQuery.mock.calls.map(([q]) => q);
      logQuery.mockRestore();
      expect(body(res).errors).toBeUndefined();
      const rooms = body(res).data?.searchRooms as {
        availabilities: unknown[];
      }[];
      expect(rooms.map((r) => r.availabilities.length)).toEqual([2, 2, 2]);
      expect(sql.filter((q) => q.includes('availabilities'))).toHaveLength(1);
    });
  });
});
