import { INestApplication } from '@nestjs/common';
import request from 'supertest';
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
import { createTestApp, resetDatabase } from './create-app.js';

const UNKNOWN_ID = '7b1e4c2d-5a3f-4d8e-9c6b-1f2a3b4c5d6e';

const pad = (n: number) => String(n).padStart(2, '0');
const at = (day: number, hour: number) =>
  `2026-12-${pad(day)}T${pad(hour)}:00:00.000Z`;

describe('Reservations routes (e2e)', () => {
  let app: INestApplication<App>;
  let roomId: string;
  const http = () => request(app.getHttpServer());

  const createRoom = async (): Promise<string> => {
    const body: RoomCreateRequest = {
      name: 'Salle Paris',
      capacity: 20,
      location: 'Paris',
      pricePerHour: 45,
    };
    const res = await http().post('/api/rooms').send(body).expect(201);
    return (res.body as Room).id;
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
    roomId = await createRoom();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST valid body -> 201 PENDING with computed amount, GET returns the same', async () => {
    const r = await create();
    expect(r).toMatchObject({
      status: 'PENDING',
      totalAmount: 135,
      currency: 'EUR',
      startAt: at(1, 9),
      endAt: at(1, 12),
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

  it('POST participants above capacity -> 400', () => {
    return http()
      .post('/api/reservations')
      .send(payload({ numberOfParticipants: 21 }))
      .expect(400);
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

  it('PATCH slot on CONFIRMED -> PENDING with recomputed amount, persisted', async () => {
    const r = await create();
    await http().post(`/api/reservations/${r.id}/confirm`).expect(200);

    const patch: ReservationUpdateRequest = {
      startAt: at(1, 13),
      endAt: at(1, 15),
    };
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send(patch)
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'PENDING',
      totalAmount: 90,
      startAt: at(1, 13),
      endAt: at(1, 15),
    });

    const fetched = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(fetched.body).toMatchObject({
      status: 'PENDING',
      totalAmount: 90,
      startAt: at(1, 13),
      endAt: at(1, 15),
    });
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

  it('POST /:id/reject -> 200 REJECTED', async () => {
    const r = await create();
    const reject: ReservationRejectRequest = { reason: 'Salle indisponible' };
    const res = await http()
      .post(`/api/reservations/${r.id}/reject`)
      .send(reject)
      .expect(200);
    expect(res.body).toMatchObject({ status: 'REJECTED' });
  });

  it('GET list filters by status and from/to', async () => {
    const pending = await create();
    const confirmed = await create({ startAt: at(1, 13), endAt: at(1, 14) });
    await http().post(`/api/reservations/${confirmed.id}/confirm`).expect(200);
    await create({ startAt: at(5, 9), endAt: at(5, 10) });

    const res = await http()
      .get('/api/reservations')
      .query({ status: 'PENDING', from: '2026-12-01', to: '2026-12-01' })
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

  it('DELETE room with an active reservation -> 409 ROOM_HAS_RESERVATIONS', async () => {
    await create();
    const res = await http().delete(`/api/rooms/${roomId}`).expect(409);
    expect(res.body).toMatchObject({ code: 'ROOM_HAS_RESERVATIONS' });
  });
});
