import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type {
  ApiError,
  AvailabilityUpdateRequest,
  PaginatedRooms,
  Room,
  RoomCreateRequest,
  RoomUpdateRequest,
} from '../src/contract.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { createTestApp, resetDatabase, loginAs } from './create-app.js';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

const json = <T>(res: { body: unknown }) => res.body as T;

const roomBody = (
  overrides: Partial<RoomCreateRequest> = {},
): RoomCreateRequest => ({
  name: 'Salle Paris',
  capacity: 20,
  location: 'Paris',
  pricePerHour: 35,
  ...overrides,
});

describe('Rooms routes (e2e)', () => {
  let app: INestApplication<App>;
  let token: string;

  const http = () =>
    request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);

  const createRoom = async (overrides?: Partial<RoomCreateRequest>) => {
    const res = await http()
      .post('/api/rooms')
      .send(roomBody(overrides))
      .expect(201);
    return res.body as Room;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await loginAs(app, undefined, 'GESTIONNAIRE');
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/rooms then GET /api/rooms/:roomId returns the same room', async () => {
    const created = await createRoom({ description: 'Lumineuse' });

    expect(created).toMatchObject({
      name: 'Salle Paris',
      description: 'Lumineuse',
      capacity: 20,
      location: 'Paris',
      equipment: [],
      pricePerHour: 35,
      status: 'ACTIVE',
      ownerId: userFixture.id,
    });
    expect(created.imageUrl).toBeUndefined();

    const fetched = await http().get(`/api/rooms/${created.id}`).expect(200);
    expect(fetched.body).toEqual(created);
  });

  it('GET /api/rooms lists created rooms with total', async () => {
    await createRoom();
    await createRoom({ name: 'Salle Lyon', location: 'Lyon' });

    const res = await http().get('/api/rooms').expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.total).toBe(2);
    expect(page.items).toHaveLength(2);
  });

  it('GET /api/rooms filters by location', async () => {
    await createRoom();
    await createRoom({ name: 'Salle Lyon', location: 'Lyon' });

    const res = await http()
      .get('/api/rooms')
      .query({ location: 'Lyon' })
      .expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe('Salle Lyon');
  });

  it('GET /api/rooms filters by capacityMin', async () => {
    await createRoom({ capacity: 10 });
    await createRoom({ name: 'Grande salle', capacity: 40 });

    const res = await http()
      .get('/api/rooms')
      .query({ capacityMin: 30 })
      .expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe('Grande salle');
  });

  it('GET /api/rooms filters by availability date, time range and state', async () => {
    const date = '2026-11-02';
    const availableRoom = await createRoom({ name: 'Disponible' });
    const unavailableRoom = await createRoom({ name: 'Indisponible' });
    await http()
      .put(`/api/rooms/${availableRoom.id}/availability`)
      .send({
        date,
        slots: [{ startTime: '09:00', endTime: '12:00', available: true }],
      })
      .expect(200);
    await http()
      .put(`/api/rooms/${unavailableRoom.id}/availability`)
      .send({
        date,
        slots: [{ startTime: '09:00', endTime: '12:00', available: false }],
      })
      .expect(200);

    const res = await http()
      .get('/api/rooms')
      .query({
        date,
        startTime: '10:00',
        endTime: '11:00',
        available: true,
      })
      .expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe('Disponible');

    const unavailable = await http()
      .get('/api/rooms')
      .query({ date, available: false })
      .expect(200);
    expect(json<PaginatedRooms>(unavailable).items.map((r) => r.name)).toEqual([
      'Indisponible',
    ]);
  });

  it('GET /api/rooms paginates with pageSize', async () => {
    await createRoom();
    await createRoom({ name: 'Salle Lyon' });

    const res = await http()
      .get('/api/rooms')
      .query({ pageSize: 1 })
      .expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.items).toHaveLength(1);
    expect(page.total).toBe(2);
  });

  it('GET /api/rooms/:roomId with unknown id -> 404 NOT_FOUND', async () => {
    const res = await http().get(`/api/rooms/${UNKNOWN_ID}`).expect(404);
    expect(json<ApiError>(res).code).toBe('NOT_FOUND');
  });

  it('PATCH /api/rooms/:roomId persists the status', async () => {
    const created = await createRoom();
    const body: RoomUpdateRequest = { status: 'INACTIVE' };

    const patched = await http()
      .patch(`/api/rooms/${created.id}`)
      .send(body)
      .expect(200);
    expect(json<Room>(patched).status).toBe('INACTIVE');

    const fetched = await http().get(`/api/rooms/${created.id}`).expect(200);
    expect(json<Room>(fetched).status).toBe('INACTIVE');
  });

  it('PATCH /api/rooms/:roomId with one field keeps the others', async () => {
    const created = await createRoom();

    const patched = await http()
      .patch(`/api/rooms/${created.id}`)
      .send({ capacity: 30 })
      .expect(200);
    expect(json<Room>(patched)).toMatchObject({
      capacity: 30,
      name: created.name,
      location: created.location,
      pricePerHour: created.pricePerHour,
    });

    const fetched = await http().get(`/api/rooms/${created.id}`).expect(200);
    expect(json<Room>(fetched)).toMatchObject({
      capacity: 30,
      name: created.name,
      location: created.location,
      pricePerHour: created.pricePerHour,
    });
  });

  it('DELETE /api/rooms/:roomId -> 204 then GET -> 404', async () => {
    const created = await createRoom();

    await http().delete(`/api/rooms/${created.id}`).expect(204);
    await http().get(`/api/rooms/${created.id}`).expect(404);
  });

  it('DELETE /api/rooms/:roomId with unknown id -> 404', async () => {
    const res = await http().delete(`/api/rooms/${UNKNOWN_ID}`).expect(404);
    expect(json<ApiError>(res).code).toBe('NOT_FOUND');
  });

  it('PUT then GET availability replaces the slots of the day', async () => {
    const created = await createRoom();
    const date = '2026-11-02';
    const first: AvailabilityUpdateRequest = {
      date,
      slots: [
        { startTime: '09:00', endTime: '12:30', available: true },
        { startTime: '14:00', endTime: '18:00', available: true },
      ],
    };

    const put = await http()
      .put(`/api/rooms/${created.id}/availability`)
      .send(first)
      .expect(200);
    expect(put.body).toEqual([
      { startTime: '09:00', endTime: '12:30', available: true },
      { startTime: '14:00', endTime: '18:00', available: true },
    ]);

    const get = await http()
      .get(`/api/rooms/${created.id}/availability`)
      .query({ date })
      .expect(200);
    expect(get.body).toEqual(put.body);

    const replaced: AvailabilityUpdateRequest = {
      date,
      slots: [{ startTime: '10:00', endTime: '11:00', available: true }],
    };
    await http()
      .put(`/api/rooms/${created.id}/availability`)
      .send(replaced)
      .expect(200);

    const after = await http()
      .get(`/api/rooms/${created.id}/availability`)
      .query({ date })
      .expect(200);
    expect(after.body).toEqual([
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
  });

  it('PUT availability keeps explicitly unavailable slots', async () => {
    const created = await createRoom();
    const res = await http()
      .put(`/api/rooms/${created.id}/availability`)
      .send({
        date: '2026-11-02',
        slots: [
          { startTime: '09:00', endTime: '10:00', available: false },
          { startTime: '10:00', endTime: '11:00', available: true },
        ],
      })
      .expect(200);

    expect(res.body).toEqual([
      { startTime: '09:00', endTime: '10:00', available: false },
      { startTime: '10:00', endTime: '11:00', available: true },
    ]);
  });

  it.each([
    ['endTime before startTime', '14:00', '09:00'],
    ['endTime equal to startTime', '09:00', '09:00'],
  ])('PUT availability with %s -> 400', async (_label, startTime, endTime) => {
    const created = await createRoom();
    const res = await http()
      .put(`/api/rooms/${created.id}/availability`)
      .send({
        date: '2026-11-02',
        slots: [{ startTime, endTime, available: true }],
      })
      .expect(400);
    expect(json<ApiError>(res).code).toBe('VALIDATION_ERROR');
  });

  it('PUT availability with unknown room -> 404', async () => {
    const res = await http()
      .put(`/api/rooms/${UNKNOWN_ID}/availability`)
      .send({
        date: '2026-11-02',
        slots: [{ startTime: '09:00', endTime: '10:00', available: true }],
      })
      .expect(404);
    expect(json<ApiError>(res).code).toBe('NOT_FOUND');
  });

  it('DELETE room removes its availability rows', async () => {
    const created = await createRoom();
    await http()
      .put(`/api/rooms/${created.id}/availability`)
      .send({
        date: '2026-11-02',
        slots: [{ startTime: '09:00', endTime: '10:00', available: true }],
      })
      .expect(200);

    await http().delete(`/api/rooms/${created.id}`).expect(204);

    const rows: { count: string }[] = await app
      .get(DataSource)
      .query('SELECT count(*) FROM availabilities');
    expect(Number(rows[0].count)).toBe(0);
  });

  it('GET /api/rooms with non-integer capacityMin -> 400', () => {
    return http().get('/api/rooms').query({ capacityMin: 'abc' }).expect(400);
  });

  it('GET /api/rooms with capacityMin above capacityMax -> 400', () => {
    return http()
      .get('/api/rooms')
      .query({ capacityMin: 5, capacityMax: 3 })
      .expect(400);
  });

  it('GET /api/rooms with non-boolean available -> 400', () => {
    return http().get('/api/rooms').query({ available: 'maybe' }).expect(400);
  });

  it('POST /api/rooms with name over 100 chars -> 400', () => {
    return http()
      .post('/api/rooms')
      .send(roomBody({ name: 'a'.repeat(101) }))
      .expect(400);
  });

  it('GET /api/rooms with page 1e22 -> 400 (offset overflow)', () => {
    return http().get('/api/rooms').query({ page: '1e22' }).expect(400);
  });

  it('GET /api/rooms search with % matches only the literal %', async () => {
    await createRoom({ name: 'Salle 100% lumière' });
    await createRoom({ name: 'Salle Paris' });

    const res = await http()
      .get('/api/rooms')
      .query({ search: '%' })
      .expect(200);
    const page = json<PaginatedRooms>(res);
    expect(page.total).toBe(1);
    expect(page.items[0].name).toBe('Salle 100% lumière');
  });

  it('GET /api/rooms search with _ matches only the literal _', async () => {
    await createRoom({ name: 'Salle A_B' });
    await createRoom({ name: 'Salle AXB' });

    const res = await http()
      .get('/api/rooms')
      .query({ search: '_' })
      .expect(200);
    expect(json<PaginatedRooms>(res).items.map((r) => r.name)).toEqual([
      'Salle A_B',
    ]);
  });

  it('GET /api/rooms with pageSize above 100 -> 400', () => {
    return http().get('/api/rooms').query({ pageSize: 500 }).expect(400);
  });

  it('GET /api/rooms with invalid calendar date -> 400', () => {
    return http().get('/api/rooms').query({ date: '2026-13-45' }).expect(400);
  });

  it('GET /api/rooms/:roomId/availability without date -> 400', () => {
    return http().get(`/api/rooms/${UNKNOWN_ID}/availability`).expect(400);
  });

  it('GET /api/rooms/:roomId with non-uuid id -> 400', () => {
    return http().get('/api/rooms/not-a-uuid').expect(400);
  });
});
