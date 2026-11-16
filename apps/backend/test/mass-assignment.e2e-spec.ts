import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import {
  createTestApp,
  fieldsOf,
  loginAs,
  resetDatabase,
} from './create-app.js';

// Mass assignment (OWASP API3). setup-app.ts runs ValidationPipe with
// whitelist + forbidNonWhitelisted: an undeclared field must return 400 and
// write nothing. ZAP cannot know which fields are sensitive, so each one is
// named here.

const startAt = '2026-12-01T09:00:00Z';
const endAt = '2026-12-01T10:00:00Z';

describe('Mass assignment protection (e2e, OWASP API3)', () => {
  let app: INestApplication<App>;
  let client: string;
  let manager: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    client = await loginAs(app);
    manager = await loginAs(app, userFixture.email, 'GESTIONNAIRE');
  });

  afterAll(async () => {
    await app.close();
  });

  const countRows = async (table: string) => {
    const [{ count }] = await app
      .get(DataSource)
      .query<{ count: string }[]>(`SELECT count(*) FROM ${table}`);
    return Number(count);
  };

  it.each([
    {
      name: 'POST /api/auth/register role',
      send: () =>
        http().post('/api/auth/register').send({
          firstName: 'Eve',
          lastName: 'Attacker',
          email: 'eve@example.com',
          password: 'longenough',
          role: 'ADMINISTRATEUR',
        }),
      field: 'role',
    },
    {
      name: 'POST /api/reservations status',
      send: () =>
        http()
          .post('/api/reservations')
          .set('Authorization', `Bearer ${client}`)
          .send({ roomId: randomUUID(), startAt, endAt, status: 'CONFIRMED' }),
      field: 'status',
    },
    {
      name: 'POST /api/reservations userId',
      send: () =>
        http()
          .post('/api/reservations')
          .set('Authorization', `Bearer ${client}`)
          .send({ roomId: randomUUID(), startAt, endAt, userId: randomUUID() }),
      field: 'userId',
    },
    {
      name: 'PATCH /api/reservations/:id status',
      send: () =>
        http()
          .patch(`/api/reservations/${randomUUID()}`)
          .set('Authorization', `Bearer ${client}`)
          .send({ status: 'CONFIRMED' }),
      field: 'status',
    },
    {
      name: 'POST /api/rooms status',
      send: () =>
        http()
          .post('/api/rooms')
          .set('Authorization', `Bearer ${manager}`)
          .send({
            name: 'Salle',
            capacity: 4,
            location: 'Lyon',
            pricePerHour: 10,
            status: 'ACTIVE',
          }),
      field: 'status',
    },
    {
      name: 'PATCH /api/rooms/:id id',
      send: () =>
        http()
          .patch(`/api/rooms/${randomUUID()}`)
          .set('Authorization', `Bearer ${manager}`)
          .send({ id: randomUUID() }),
      field: 'id',
    },
    {
      name: 'PATCH /api/users/:id passwordHash',
      send: () =>
        http()
          .patch(`/api/users/${userFixture.id}`)
          .set('Authorization', `Bearer ${client}`)
          .send({ passwordHash: 'x' }),
      field: 'passwordHash',
    },
    {
      name: 'POST /api/payments amount',
      send: () =>
        http()
          .post('/api/payments')
          .set('Authorization', `Bearer ${client}`)
          .send({
            reservationId: randomUUID(),
            paymentMethod: 'CARD',
            amount: 0,
          }),
      field: 'amount',
    },
  ])(
    '$name -> 400 on undeclared "$field", nothing written',
    async ({ send, field }) => {
      const before = await Promise.all([
        countRows('users'),
        countRows('reservations'),
        countRows('rooms'),
        countRows('payments'),
      ]);

      const res = await send().expect(400);

      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(fieldsOf(res.body)).toHaveProperty([field]);
      const after = await Promise.all([
        countRows('users'),
        countRows('reservations'),
        countRows('rooms'),
        countRows('payments'),
      ]);
      expect(after).toEqual(before);
    },
  );

  it('POST /api/auth/register without role -> 201, role forced to CLIENT (control)', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        password: 'longenough',
      })
      .expect(201);
    expect(res.body).toMatchObject({ role: 'CLIENT' });
  });
});
