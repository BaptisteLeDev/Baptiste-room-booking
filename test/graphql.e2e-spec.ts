import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
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
});
