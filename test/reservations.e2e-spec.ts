import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type {
  Reservation,
  ReservationCreateRequest,
  ReservationRejectRequest,
  ReservationUpdateRequest,
} from '../src/contract.js';
import { createTestApp } from './create-app.js';

const ROOM_ID = '3f2c8a4e-9b1d-4e7a-8c5f-2a6b7d8e9f01';
const UNKNOWN_ID = '7b1e4c2d-5a3f-4d8e-9c6b-1f2a3b4c5d6e';

const slot = (
  day: number,
): Pick<ReservationCreateRequest, 'startAt' | 'endAt'> => {
  const d = String(day).padStart(2, '0');
  return { startAt: `2026-12-${d}T09:00:00Z`, endAt: `2026-12-${d}T10:00:00Z` };
};

const body = (day: number): ReservationCreateRequest => ({
  roomId: ROOM_ID,
  ...slot(day),
  numberOfParticipants: 4,
  comment: 'Projecteur',
});

describe('Reservations routes (e2e)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  const create = async (day: number): Promise<Reservation> => {
    const res = await http()
      .post('/api/reservations')
      .send(body(day))
      .expect(201);
    return res.body as Reservation;
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST valid body -> 201 PENDING with computed amount', async () => {
    const r = await create(1);
    expect(r.status).toBe('PENDING');
    expect(r.totalAmount).toBe(35);
  });

  it('GET list after create contains it', async () => {
    const r = await create(2);
    const res = await http().get('/api/reservations').expect(200);
    const items = (res.body as { items: Reservation[] }).items;
    expect(items.map((i) => i.id)).toContain(r.id);
  });

  it('POST overlapping slot -> 409 SLOT_UNAVAILABLE', async () => {
    await create(3);
    const res = await http()
      .post('/api/reservations')
      .send(body(3))
      .expect(409);
    expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
  });

  it('POST participants above capacity -> 400', () => {
    return http()
      .post('/api/reservations')
      .send({ ...body(4), numberOfParticipants: 21 })
      .expect(400);
  });

  it('POST startAt >= endAt -> 400', () => {
    return http()
      .post('/api/reservations')
      .send({
        ...body(4),
        startAt: '2026-12-04T10:00:00Z',
        endAt: '2026-12-04T09:00:00Z',
      })
      .expect(400);
  });

  it('POST roomId not a uuid -> 400', () => {
    return http()
      .post('/api/reservations')
      .send({ ...body(4), roomId: 'not-a-uuid' })
      .expect(400);
  });

  it('POST valid body with unknown field -> 400', () => {
    return http()
      .post('/api/reservations')
      .send({ ...body(4), unknownField: true })
      .expect(400);
  });

  it('GET /:id -> 200', async () => {
    const r = await create(5);
    const res = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(res.body).toMatchObject({ id: r.id });
  });

  it('GET /:id unknown uuid -> 404 NOT_FOUND', async () => {
    const res = await http().get(`/api/reservations/${UNKNOWN_ID}`).expect(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('GET /:id with non-uuid id -> 400', () => {
    return http().get('/api/reservations/not-a-uuid').expect(400);
  });

  it('PATCH /:id -> 200 with new comment', async () => {
    const r = await create(6);
    const patch: ReservationUpdateRequest = { comment: 'Déplacé' };
    const res = await http()
      .patch(`/api/reservations/${r.id}`)
      .send(patch)
      .expect(200);
    expect(res.body).toMatchObject({ id: r.id, comment: 'Déplacé' });
  });

  it('DELETE /:id -> 204 then GET shows CANCELLED', async () => {
    const r = await create(7);
    await http().delete(`/api/reservations/${r.id}`).expect(204);
    const res = await http().get(`/api/reservations/${r.id}`).expect(200);
    expect(res.body).toMatchObject({ status: 'CANCELLED' });
  });

  it('POST /:id/confirm -> 200 CONFIRMED, twice -> 409', async () => {
    const r = await create(8);
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
    const r = await create(9);
    const reject: ReservationRejectRequest = { reason: 'Salle indisponible' };
    const res = await http()
      .post(`/api/reservations/${r.id}/reject`)
      .send(reject)
      .expect(200);
    expect(res.body).toMatchObject({ status: 'REJECTED' });
  });

  it('GET list with unknown status -> 400', () => {
    return http()
      .get('/api/reservations')
      .query({ status: 'NOPE' })
      .expect(400);
  });
});
