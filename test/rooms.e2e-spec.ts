import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type {
  AvailabilityUpdateRequest,
  RoomCreateRequest,
  RoomUpdateRequest,
} from '../src/contract.js';
import { createTestApp } from './create-app.js';

const ROOM_ID = '3f2c8a4e-9b1d-4e7a-8c5f-2a6b7d8e9f01';

describe('Rooms routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/rooms -> 200', () => {
    return request(app.getHttpServer()).get('/api/rooms').expect(200);
  });

  it('POST /api/rooms -> 201', () => {
    const body: RoomCreateRequest = {
      name: 'Salle Paris',
      capacity: 20,
      location: 'Paris',
      pricePerHour: 35,
    };
    return request(app.getHttpServer())
      .post('/api/rooms')
      .send(body)
      .expect(201);
  });

  it('GET /api/rooms/:roomId -> 200', () => {
    return request(app.getHttpServer())
      .get(`/api/rooms/${ROOM_ID}`)
      .expect(200);
  });

  it('GET /api/rooms/:roomId with non-uuid id -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms/not-a-uuid')
      .expect(400);
  });

  it('PATCH /api/rooms/:roomId -> 200', () => {
    const body: RoomUpdateRequest = { status: 'INACTIVE' };
    return request(app.getHttpServer())
      .patch(`/api/rooms/${ROOM_ID}`)
      .send(body)
      .expect(200);
  });

  it('DELETE /api/rooms/:roomId -> 204', () => {
    return request(app.getHttpServer())
      .delete(`/api/rooms/${ROOM_ID}`)
      .expect(204);
  });

  it('GET /api/rooms/:roomId/availability -> 200', () => {
    return request(app.getHttpServer())
      .get(`/api/rooms/${ROOM_ID}/availability`)
      .query({ date: '2026-11-02' })
      .expect(200);
  });

  it('PUT /api/rooms/:roomId/availability -> 200', () => {
    const body: AvailabilityUpdateRequest = {
      date: '2026-11-02',
      slots: [{ startTime: '09:00', endTime: '12:30', available: true }],
    };
    return request(app.getHttpServer())
      .put(`/api/rooms/${ROOM_ID}/availability`)
      .send(body)
      .expect(200);
  });

  it('GET /api/rooms with non-integer capacityMin -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms')
      .query({ capacityMin: 'abc' })
      .expect(400);
  });

  it('GET /api/rooms with capacityMin above capacityMax -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms')
      .query({ capacityMin: 5, capacityMax: 3 })
      .expect(400);
  });

  it('GET /api/rooms with non-boolean available -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms')
      .query({ available: 'maybe' })
      .expect(400);
  });

  it('GET /api/rooms with pageSize above 100 -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms')
      .query({ pageSize: 500 })
      .expect(400);
  });

  it('GET /api/rooms with invalid calendar date -> 400', () => {
    return request(app.getHttpServer())
      .get('/api/rooms')
      .query({ date: '2026-13-45' })
      .expect(400);
  });

  it('GET /api/rooms/:roomId/availability without date -> 400', () => {
    return request(app.getHttpServer())
      .get(`/api/rooms/${ROOM_ID}/availability`)
      .expect(400);
  });
});
