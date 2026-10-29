import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import {
  createTestApp,
  fieldsOf,
  loginAs,
  resetDatabase,
} from './create-app.js';

// Rate limiting and resource bounds (OWASP API4). No throttler is wired yet:
// the flood tests are it.fails, they pass while the protection is missing and
// must be switched to it() once a 429 is returned.

const FLOOD = 20;

describe('Rate limiting and resource bounds (e2e, OWASP API4)', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it.fails(
    `POST /api/auth/login -> 429 after ${FLOOD} wrong passwords`,
    async () => {
      const statuses: number[] = [];
      for (let i = 0; i < FLOOD; i++) {
        const res = await http()
          .post('/api/auth/login')
          .send({ email: userFixture.email, password: 'wrongpass' });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    },
  );

  it.fails(
    `POST /api/auth/register -> 429 after ${FLOOD} attempts`,
    async () => {
      const statuses: number[] = [];
      for (let i = 0; i < FLOOD; i++) {
        const res = await http()
          .post('/api/auth/register')
          .send({
            firstName: 'Flood',
            lastName: 'Test',
            email: `flood${i}@example.com`,
            password: 'longenough',
          });
        statuses.push(res.status);
      }
      expect(statuses).toContain(429);
    },
  );

  it.each([
    { path: '/api/rooms', role: 'CLIENT' },
    { path: '/api/reservations', role: 'CLIENT' },
    { path: '/api/users', role: 'GESTIONNAIRE' },
    { path: '/api/admin/reservations', role: 'ADMINISTRATEUR' },
  ])(
    'GET $path?pageSize=101 -> 400 (page size capped at 100)',
    async ({ path, role }) => {
      const token = await loginAs(app, userFixture.email, role);
      const res = await http()
        .get(path)
        .query({ pageSize: 101 })
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR' });
      expect(fieldsOf(res.body)).toHaveProperty(['pageSize']);
    },
  );
});
