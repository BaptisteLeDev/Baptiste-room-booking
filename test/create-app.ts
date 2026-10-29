import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import { hashPassword } from '../src/modules/auth/infra/scrypt-password-hasher.js';
import {
  TOKEN_ISSUER,
  type TokenIssuer,
} from '../src/modules/auth/domain/token-issuer.js';

// Throttling is off unless asked: every spec logs in many times from one IP.
export async function createTestApp({ throttle = false } = {}): Promise<
  INestApplication<App>
> {
  const builder = Test.createTestingModule({ imports: [AppModule] });
  if (!throttle) {
    builder.overrideProvider(ThrottlerStorage).useValue({
      increment: async () => ({
        totalHits: 0,
        timeToExpire: 0,
        isBlocked: false,
        timeToBlockExpire: 0,
      }),
    });
  }
  const moduleFixture = await builder.compile();

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

export async function loginAs(
  app: INestApplication<App>,
  email = userFixture.email,
  role = 'CLIENT',
): Promise<string> {
  // role always reset: fixture user is shared across spec files
  const dataSource = app.get(DataSource);
  await dataSource.query(
    'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3',
    [await hashPassword(TEST_PASSWORD), role, email],
  );
  // signs directly: POST /auth/login is throttled and would run out mid-spec
  const [{ id }] = await dataSource.query<{ id: string }[]>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );
  return (await app.get<TokenIssuer>(TOKEN_ISSUER).sign(id)).token;
}

export const fieldsOf = (body: unknown) =>
  (body as { details: { fields: Record<string, string[]> } }).details.fields;
