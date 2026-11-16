import { INestApplication } from '@nestjs/common';
import { randomBytes, scryptSync } from 'node:crypto';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type {
  ApiError,
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from '../src/contract.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import {
  createTestApp,
  loginAs,
  resetDatabase,
  TEST_PASSWORD,
} from './create-app.js';

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

  it('POST /api/auth/login -> 200 with token, expiry and user', async () => {
    await loginAs(app);
    const body: LoginRequest = {
      email: userFixture.email,
      password: TEST_PASSWORD,
    };
    const res = await http().post('/api/auth/login').send(body).expect(200);
    expect(json<AuthResponse>(res).accessToken).toEqual(expect.any(String));
    expect(res.body).toMatchObject({
      expiresIn: 3600,
      user: { id: userFixture.id, email: userFixture.email },
    });
  });

  it.each([
    ['unknown email', 'missing@example.com', TEST_PASSWORD],
    ['wrong password', userFixture.email, 'wrongpass'],
  ])(
    'POST /api/auth/login -> 401 INVALID_CREDENTIALS on %s',
    async (_, email, password) => {
      await loginAs(app);
      const res = await http()
        .post('/api/auth/login')
        .send({ email, password })
        .expect(401);
      expect(res.body).toEqual({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants invalides.',
      });
    },
  );

  it('GET /api/auth/me -> 401 without token', () => {
    return http().get('/api/auth/me').expect(401);
  });

  it('GET /api/auth/me -> 200 for the authenticated user', async () => {
    const token = await loginAs(app);
    const res = await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toMatchObject({
      id: userFixture.id,
      email: userFixture.email,
      role: 'CLIENT',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /api/auth/logout -> 204 then same token -> 401', async () => {
    const token = await loginAs(app);
    await http()
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  it('PATCH /api/auth/password -> 204 then login with new password', async () => {
    const token = await loginAs(app);
    const body: ChangePasswordRequest = {
      currentPassword: TEST_PASSWORD,
      newPassword: 'newsecret',
    };
    await http()
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send(body)
      .expect(204);
    await http()
      .post('/api/auth/login')
      .send({ email: userFixture.email, password: 'newsecret' })
      .expect(200);
  });

  it('PATCH /api/auth/password -> old token 401 on /me in the same second', async () => {
    const oldToken = await loginAs(app);
    await http()
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({
        currentPassword: TEST_PASSWORD,
        newPassword: 'newsecret',
      } satisfies ChangePasswordRequest)
      .expect(204);
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    const res = await http()
      .post('/api/auth/login')
      .send({ email: userFixture.email, password: 'newsecret' })
      .expect(200);
    const newToken = json<AuthResponse>(res).accessToken;
    await http()
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);
  });

  it('POST /api/auth/login -> rehashes a legacy scrypt hash to the current params', async () => {
    const salt = randomBytes(16);
    const legacy = `scrypt$${salt.toString('hex')}$${scryptSync(TEST_PASSWORD, salt, 64).toString('hex')}`;
    await app
      .get(DataSource)
      .query('UPDATE users SET password_hash = $1 WHERE email = $2', [
        legacy,
        userFixture.email,
      ]);

    await http()
      .post('/api/auth/login')
      .send({ email: userFixture.email, password: TEST_PASSWORD })
      .expect(200);

    const [{ password_hash }] = await app
      .get(DataSource)
      .query<{ password_hash: string }[]>(
        'SELECT password_hash FROM users WHERE email = $1',
        [userFixture.email],
      );
    expect(password_hash).toMatch(/^scrypt\$v2\$131072\$8\$1\$/);
  });

  it('POST /api/auth/logout -> purges expired revoked tokens', async () => {
    const dataSource = app.get(DataSource);
    await dataSource.query(
      `INSERT INTO revoked_tokens (jti, expires_at) VALUES ('expired-jti', now() - interval '1 minute')`,
    );
    const token = await loginAs(app);
    await http()
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    const rows = await dataSource.query<{ jti: string }[]>(
      `SELECT jti FROM revoked_tokens WHERE jti = 'expired-jti'`,
    );
    expect(rows).toEqual([]);
  });

  it('GET /api/rooms -> 200 without token (public)', () => {
    return http().get('/api/rooms').expect(200);
  });

  it('POST /api/rooms -> 401 without token', () => {
    return http().post('/api/rooms').send({}).expect(401);
  });
});
