import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types.js';
import type {
  AvailabilityUpdateRequest,
  PaginatedReservations,
  Reservation,
  ReservationCreateRequest,
  ReservationRejectRequest,
  ReservationUpdateRequest,
  Room,
  RoomCreateRequest,
} from '../src/contract.js';
import {
  createTestApp,
  loginAs,
  openAvailability,
  resetDatabase,
} from './create-app.js';

const UNKNOWN_ID = '7b1e4c2d-5a3f-4d8e-9c6b-1f2a3b4c5d6e';

const pad = (n: number) => String(n).padStart(2, '0');
const at = (day: number, hour: number) =>
  `2026-12-${pad(day)}T${pad(hour)}:00:00Z`;
const iso = (day: number, hour: number) =>
  new Date(at(day, hour)).toISOString();

describe('Reservations routes (e2e)', () => {
  let app: INestApplication<App>;
  let roomId: string;
  let token: string;
  const http = () =>
    request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);

  const createRoom = async (): Promise<string> => {
    const body: RoomCreateRequest = {
      name: 'Salle Paris',
      capacity: 20,
      location: 'Paris',
      pricePerHour: 45,
    };
    const res = await http().post('/api/rooms').send(body).expect(201);
    const id = (res.body as Room).id;
    await openAvailability(app, token, id);
    return id;
  };

  const payload = (
    overrides: Partial<ReservationCreateRequest> = {},
  ): ReservationCreateRequest => ({
    roomId,
    startAt: at(1, 9),
    endAt: at(1, 12),
    numberOfParticipants: 4,
    comment: 'Projecteur',
    ...overrides,
  });

  const create = async (
    overrides: Partial<ReservationCreateRequest> = {},
  ): Promise<Reservation> => {
    const res = await http()
      .post('/api/reservations')
      .send(payload(overrides))
      .expect(201);
    return res.body as Reservation;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    token = await loginAs(app, undefined, 'GESTIONNAIRE');
    roomId = await createRoom();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST valid body -> 201 PENDING with computed amount, GET returns the same', async () => {
    const r = await create();
    expect(r).toMatchObject({
      status: 'PENDING_PAYMENT',
      totalAmount: 135,
      currency: 'EUR',
      startAt: iso(1, 9),
      endAt: iso(1, 12),
      comment: 'Projecteur',
      numberOfParticipants: 4,
    });

    const res = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(res.body).toEqual(r);
  });

  it('GET list after create contains it', async () => {
    const r = await create();
    const res = await http().get('/api/reservations').expect(200);
    const items = (res.body as PaginatedReservations).items as Reservation[];
    expect(items.map((i) => i.id)).toContain(r.id);
  });

  it('POST overlapping slot -> 409 SLOT_UNAVAILABLE', async () => {
    await create();
    const res = await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(1, 10), endAt: at(1, 11) }))
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('POST outside open hours -> 409 SLOT_UNAVAILABLE', async () => {
    const res = await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(1, 19), endAt: at(1, 21) }))
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('POST on a closed day -> 409 SLOT_UNAVAILABLE', async () => {
    await http()
      .put(`/api/rooms/${roomId}/availability`)
      .send({
        date: '2026-12-02',
        slots: [{ startTime: '08:00', endTime: '20:00', available: false }],
      } satisfies AvailabilityUpdateRequest)
      .expect(200);
    const res = await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(2, 9), endAt: at(2, 10) }))
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('closed range inside open hours: booking across it -> 409, before it -> 201', async () => {
    await http()
      .put(`/api/rooms/${roomId}/availability`)
      .send({
        date: '2026-12-02',
        slots: [
          { startTime: '08:00', endTime: '20:00', available: true },
          { startTime: '12:00', endTime: '13:00', available: false },
        ],
      } satisfies AvailabilityUpdateRequest)
      .expect(200);
    await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(2, 10), endAt: at(2, 13) }))
      .expect(409);
    await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(2, 8), endAt: at(2, 10) }))
      .expect(201);
  });

  it('POST adjacent slot -> 201', async () => {
    await create();
    await http()
      .post('/api/reservations')
      .send(payload({ startAt: at(1, 12), endAt: at(1, 13) }))
      .expect(201);
  });

  it('two overlapping POST in parallel -> one 201, one 409', async () => {
    const [a, b] = await Promise.all([
      http().post('/api/reservations').send(payload()),
      http()
        .post('/api/reservations')
        .send(payload({ startAt: at(1, 10), endAt: at(1, 11) })),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
  });

  const countReservations = async (): Promise<number> => {
    const rows = await app
      .get(DataSource)
      .query<{ count: string }[]>('SELECT count(*) FROM reservations');
    return Number(rows[0].count);
  };

  it('10 overlapping POST in parallel -> one 201, nine 409, one row', async () => {
    const res = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        http()
          .post('/api/reservations')
          .send(payload({ startAt: at(1, 9 + (i % 2)), endAt: at(1, 12) })),
      ),
    );
    expect(res.filter((r) => r.status === 201)).toHaveLength(1);
    const lost = res.filter((r) => r.status === 409);
    expect(lost).toHaveLength(9);
    lost.forEach((r) =>
      expect(r.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' }),
    );
    expect(await countReservations()).toBe(1);
  });

  it('parallel POST on two rooms -> both 201', async () => {
    const other = await createRoom();
    const res = await Promise.all([
      http().post('/api/reservations').send(payload()),
      http()
        .post('/api/reservations')
        .send(payload({ roomId: other })),
    ]);
    expect(res.map((r) => r.status)).toEqual([201, 201]);
  });

  it('parallel adjacent POST -> both 201', async () => {
    const res = await Promise.all([
      http().post('/api/reservations').send(payload()),
      http()
        .post('/api/reservations')
        .send(payload({ startAt: at(1, 12), endAt: at(1, 13) })),
    ]);
    expect(res.map((r) => r.status)).toEqual([201, 201]);
  });

  it('parallel PATCH onto slot X + POST slot X -> exactly one 2xx', async () => {
    const a = await create({ startAt: at(2, 9), endAt: at(2, 10) });
    const res = await Promise.all([
      http()
        .patch(`/api/reservations/${a.id}`)
        .send({ startAt: at(1, 9), endAt: at(1, 12) }),
      http().post('/api/reservations').send(payload()),
    ]);
    expect(res.filter((r) => r.status < 300)).toHaveLength(1);
    expect(res.filter((r) => r.status === 409)).toHaveLength(1);
  });

  it('POST 21 participants -> 400, nothing stored', async () => {
    await http()
      .post('/api/reservations')
      .send(payload({ numberOfParticipants: 21 }))
      .expect(400);
    expect(await countReservations()).toBe(0);
  });

  it('POST waits while another transaction holds the room row lock', async () => {
    const runner = app.get(DataSource).createQueryRunner();
    await runner.startTransaction();
    try {
      // NO KEY UPDATE: the FK key-share lock of an insert would not wait on it
      await runner.query(
        'SELECT id FROM rooms WHERE id = $1 FOR NO KEY UPDATE',
        [roomId],
      );
      const pending = http()
        .post('/api/reservations')
        .send(payload())
        .then((r) => r);
      const early = await Promise.race([
        pending,
        new Promise<'blocked'>((r) => setTimeout(() => r('blocked'), 300)),
      ]);
      expect(early).toBe('blocked');
      await runner.commitTransaction();
      expect((await pending).status).toBe(201);
    } finally {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      await runner.release();
    }
  });

  it('POST startAt >= endAt -> 400', () => {
    return http()
      .post('/api/reservations')
      .send(payload({ startAt: at(1, 10), endAt: at(1, 9) }))
      .expect(400);
  });

  it('POST roomId not a uuid -> 400', () => {
    return http()
      .post('/api/reservations')
      .send(payload({ roomId: 'not-a-uuid' }))
      .expect(400);
  });

  it('POST valid body with unknown field -> 400', () => {
    return http()
      .post('/api/reservations')
      .send({ ...payload(), unknownField: true })
      .expect(400);
  });

  it('POST unknown roomId -> 404 NOT_FOUND', async () => {
    const res = await http()
      .post('/api/reservations')
      .send(payload({ roomId: UNKNOWN_ID }))
      .expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('GET /:id unknown uuid -> 404 NOT_FOUND', async () => {
    const res = await http().get(`/api/reservations/${UNKNOWN_ID}`).expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('GET /:id with non-uuid id -> 400', () => {
    return http().get('/api/reservations/not-a-uuid').expect(400);
  });

  it('PATCH /:id -> 200 with new comment, persisted', async () => {
    const r = await create();
    const patch: ReservationUpdateRequest = { comment: 'Déplacé' };
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send(patch)
      .expect(200);
    expect(res.body).toMatchObject({ id: r.id, comment: 'Déplacé' });

    const fetched = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(fetched.body).toMatchObject({ comment: 'Déplacé' });
  });

  it('PATCH slot on CONFIRMED -> 409 RESERVATION_STATUS_CONFLICT, unchanged', async () => {
    const r = await create();
    await http().post(`/api/reservations/${r.id}/confirm`).expect(200);

    const patch: ReservationUpdateRequest = {
      startAt: at(1, 13),
      endAt: at(1, 15),
    };
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send(patch)
      .expect(409);
    expect(res.body).toMatchObject({ code: 'RESERVATION_STATUS_CONFLICT' });

    const fetched = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(fetched.body).toMatchObject({
      status: 'CONFIRMED',
      startAt: iso(1, 9),
      endAt: iso(1, 12),
    });
  });

  it('PATCH slot outside open hours -> 409 SLOT_UNAVAILABLE', async () => {
    const r = await create();
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send({ startAt: at(1, 19), endAt: at(1, 21) })
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('PATCH slot overlapping another active reservation -> 409 SLOT_UNAVAILABLE', async () => {
    await create({ startAt: at(1, 13), endAt: at(1, 14) });
    const r = await create();
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send({ startAt: at(1, 13), endAt: at(1, 14) })
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('DELETE /:id -> 204 then GET shows CANCELLED, same slot is free again', async () => {
    const r = await create();
    await http().delete(`/api/reservations/${r.id}`).expect(204);
    const res = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(res.body).toMatchObject({ status: 'CANCELLED' });

    await create();
  });

  it('POST /:id/confirm -> 200 CONFIRMED, twice -> 409', async () => {
    const r = await create();
    const ok = await http()
      .post(`/api/reservations/${r.id}/confirm`)
      .expect(200);
    expect(ok.body).toMatchObject({ status: 'CONFIRMED' });
    const res = await http()
      .post(`/api/reservations/${r.id}/confirm`)
      .expect(409);
    expect(res.body).toMatchObject({ code: 'RESERVATION_STATUS_CONFLICT' });
  });

  it('booking client confirm -> 403, stranger GET -> 404', async () => {
    const as = async (email: string) => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ firstName: 'A', lastName: 'B', email, password: 'longenough' })
        .expect(201);
      const t = await loginAs(app, email);
      return () =>
        request.agent(app.getHttpServer()).set('Authorization', `Bearer ${t}`);
    };
    const client = await as('client@example.com');
    const stranger = await as('stranger@example.com');
    const res = await client()
      .post('/api/reservations')
      .send(payload())
      .expect(201);
    const { id } = res.body as Reservation;
    await client().post(`/api/reservations/${id}/confirm`).expect(403);
    await stranger().get(`/api/reservations/${id}`).expect(404);
  });

  it('POST /:id/reject -> 200 REJECTED', async () => {
    const r = await create();
    const reject: ReservationRejectRequest = { reason: 'Salle indisponible' };
    const res = await http()
      .post(`/api/reservations/${r.id}/reject`)
      .send(reject)
      .expect(200);
    expect(res.body).toMatchObject({ status: 'REFUSED' });
  });

  it('GET list filters by status and from/to', async () => {
    const pending = await create();
    const confirmed = await create({ startAt: at(1, 13), endAt: at(1, 14) });
    await http().post(`/api/reservations/${confirmed.id}/confirm`).expect(200);
    await create({ startAt: at(5, 9), endAt: at(5, 10) });

    const res = await http()
      .get('/api/reservations')
      .query({
        status: 'PENDING_PAYMENT',
        from: '2026-12-01',
        to: '2026-12-01',
      })
      .expect(200);
    const items = (res.body as PaginatedReservations).items as Reservation[];
    expect(items.map((i) => i.id)).toEqual([pending.id]);
  });

  it('GET list with unknown status -> 400', () => {
    return http()
      .get('/api/reservations')
      .query({ status: 'NOPE' })
      .expect(400);
  });

  it('reservation overlapping a set availability -> GET availability available:false', async () => {
    const date = '2026-12-01';
    const availability: AvailabilityUpdateRequest = {
      date,
      slots: [{ startTime: '09:00', endTime: '12:00', available: true }],
    };
    await http()
      .put(`/api/rooms/${roomId}/availability`)
      .send(availability)
      .expect(200);

    await create({ startAt: at(1, 9), endAt: at(1, 10) });

    const res = await http()
      .get(`/api/rooms/${roomId}/availability`)
      .query({ date })
      .expect(200);
    expect(res.body).toEqual([
      { startTime: '09:00', endTime: '12:00', available: false },
    ]);
  });

  it('POST reservation on INACTIVE room -> 404 NOT_FOUND', async () => {
    await http()
      .patch(`/api/rooms/${roomId}`)
      .send({ status: 'INACTIVE' })
      .expect(200);
    const res = await http()
      .post('/api/reservations')
      .send(payload())
      .expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('DELETE room with an active reservation -> 409 ROOM_HAS_RESERVATIONS', async () => {
    await create();
    const res = await http().delete(`/api/rooms/${roomId}`).expect(409);
    expect(res.body).toMatchObject({ code: 'ROOM_HAS_RESERVATIONS' });
  });
});
