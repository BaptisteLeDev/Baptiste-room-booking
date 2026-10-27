import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../src/contract.js';
import { createTestApp } from './create-app.js';

describe('Auth routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/register -> 201', () => {
    const body: RegisterRequest = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'longenough',
    };
    return request(app.getHttpServer())
      .post('/api/auth/register')
      .send(body)
      .expect(201);
  });

  it('POST /api/auth/login -> 200', () => {
    const body: LoginRequest = {
      email: 'ada@example.com',
      password: 'longenough',
    };
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send(body)
      .expect(200);
  });

  it('POST /api/auth/logout -> 204', () => {
    return request(app.getHttpServer()).post('/api/auth/logout').expect(204);
  });

  it('GET /api/auth/me -> 200', () => {
    return request(app.getHttpServer()).get('/api/auth/me').expect(200);
  });

  it('PATCH /api/auth/password -> 204', () => {
    const body: ChangePasswordRequest = {
      currentPassword: 'longenough',
      newPassword: 'newsecret',
    };
    return request(app.getHttpServer())
      .patch('/api/auth/password')
      .send(body)
      .expect(204);
  });
});
