import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { hashPassword } from '../src/modules/auth/infra/scrypt-password-hasher.js';

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication<App> = moduleFixture.createNestApplication();
  setupApp(app);
  await app.init();
  return app;
}

export async function resetDatabase(app: INestApplication<App>): Promise<void> {
  const dataSource = app.get(DataSource);
  const [{ current_database }] = await dataSource.query<
    { current_database: string }[]
  >('SELECT current_database()');
  if (current_database !== 'resa_db_test') {
    throw new Error(`refusing to truncate database "${current_database}"`);
  }
  await dataSource.query(
    'TRUNCATE payments, reservations, availabilities, rooms RESTART IDENTITY CASCADE',
  );
  await dataSource.query('DELETE FROM users WHERE id <> $1', [userFixture.id]);
  // a password change in one spec would otherwise reject fresh tokens in the next
  await dataSource.query(
    'UPDATE users SET password_changed_at = NULL WHERE id = $1',
    [userFixture.id],
  );
}

export const TEST_PASSWORD = 'password123';

// Bookings need open availability: open the spec days 08:00-20:00 Paris.
export async function openAvailability(
  app: INestApplication<App>,
  token: string,
  roomId: string,
): Promise<void> {
  for (const date of ['2026-12-01', '2026-12-02', '2026-12-05']) {
    await request(app.getHttpServer())
      .put(`/api/rooms/${roomId}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        date,
        slots: [{ startTime: '08:00', endTime: '20:00', available: true }],
      })
      .expect(200);
  }
}

export async function loginAs(
  app: INestApplication<App>,
  email = userFixture.email,
  role = 'CLIENT',
): Promise<string> {
  // role always reset: fixture user is shared across spec files
  await app
    .get(DataSource)
    .query('UPDATE users SET password_hash = $1, role = $2 WHERE email = $3', [
      await hashPassword(TEST_PASSWORD),
      role,
      email,
    ]);
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return (res.body as { accessToken: string }).accessToken;
}

export const fieldsOf = (body: unknown) =>
  (body as { details: { fields: Record<string, string[]> } }).details.fields;
