import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type {
  ApiError,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from '../src/contract.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { createTestApp, resetDatabase } from './create-app.js';

const json = <T>(res: { body: unknown }) => res.body as T;

const registerBody = (
  overrides: Partial<RegisterRequest> = {},
): RegisterRequest => ({
  firstName: 'Grace',
  lastName: 'Hopper',
  email: 'grace@example.com',
  password: 'longenough',
  ...overrides,
});

describe('Auth routes (e2e)', () => {
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

  it('POST /api/auth/register -> 201 persists user with scrypt hash', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send(registerBody())
      .expect(201);

    expect(res.body).toMatchObject({
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace@example.com',
      role: 'CLIENT',
    });
    expect(json<User>(res).id).toEqual(expect.any(String));
    expect(res.body).not.toHaveProperty('password');
    expect(res.body).not.toHaveProperty('passwordHash');

    const rows = await app
      .get(DataSource)
      .query<{ password_hash: string }[]>(
        'SELECT password_hash FROM users WHERE email = $1',
        ['grace@example.com'],
      );
    expect(rows[0].password_hash).toMatch(/^scrypt\$/);
  });

  it('POST /api/auth/register -> 409 EMAIL_ALREADY_USED on case-insensitive duplicate', async () => {
    await http().post('/api/auth/register').send(registerBody()).expect(201);

    const res = await http()
      .post('/api/auth/register')
      .send(registerBody({ email: 'GRACE@example.com' }))
      .expect(409);
    expect(res.body).toEqual({
      code: 'EMAIL_ALREADY_USED',
      message: 'Cette adresse e-mail est déjà utilisée.',
    });
  });

  it('POST /api/auth/register -> 409 when email belongs to the demo user', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send(registerBody({ email: userFixture.email }))
      .expect(409);
    expect(json<ApiError>(res).code).toBe('EMAIL_ALREADY_USED');
  });

  it('POST /api/auth/register -> 400 on invalid email', async () => {
    const res = await http()
      .post('/api/auth/register')
      .send(registerBody({ email: 'not-an-email' }))
      .expect(400);
    expect(json<ApiError>(res).code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/auth/login -> 200', () => {
    const body: LoginRequest = {
      email: 'ada@example.com',
      password: 'longenough',
    };
    return http().post('/api/auth/login').send(body).expect(200);
  });

  it('POST /api/auth/logout -> 204', () => {
    return http().post('/api/auth/logout').expect(204);
  });

  it('GET /api/auth/me -> 200 demo user', async () => {
    const res = await http().get('/api/auth/me').expect(200);
    expect(res.body).toMatchObject({
      id: userFixture.id,
      email: userFixture.email,
      role: 'CLIENT',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('PATCH /api/auth/password -> 204', () => {
    const body: ChangePasswordRequest = {
      currentPassword: 'longenough',
      newPassword: 'newsecret',
    };
    return http().patch('/api/auth/password').send(body).expect(204);
  });
});
