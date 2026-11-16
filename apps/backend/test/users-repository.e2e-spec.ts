import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../src/modules/users/domain/repositories/user.repository.interface.js';
import { createTestApp, resetDatabase } from './create-app.js';

describe('User repository (e2e)', () => {
  let app: INestApplication<App>;
  let repo: IUserRepository;
  let db: DataSource;

  const row = async () =>
    (
      await db.query<
        {
          password_hash: string;
          token_version: number;
          first_name: string;
        }[]
      >(
        'SELECT password_hash, token_version, first_name FROM users WHERE id = $1',
        [userFixture.id],
      )
    )[0];

  beforeAll(async () => {
    app = await createTestApp();
    repo = app.get<IUserRepository>(USER_REPOSITORY);
    db = app.get(DataSource);
  });

  beforeEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('updateProfile keeps password hash, token version and password change date', async () => {
    const stale = await repo.findById(userFixture.id);
    if (!stale) throw new Error('fixture user missing');
    await db.query(
      `UPDATE users SET password_hash = 'fresh', token_version = 5,
         password_changed_at = now() WHERE id = $1`,
      [userFixture.id],
    );

    stale.changeProfile({ firstName: 'Changed' });
    await repo.updateProfile(stale);

    expect(await row()).toMatchObject({
      password_hash: 'fresh',
      token_version: 5,
      first_name: 'Changed',
    });
    const [{ password_changed_at }] = await db.query<
      { password_changed_at: Date | null }[]
    >('SELECT password_changed_at FROM users WHERE id = $1', [userFixture.id]);
    expect(password_changed_at).not.toBeNull();
  });

  it('replacePasswordHash applies only while the stored hash is still the expected one', async () => {
    await repo.replacePasswordHash(userFixture.id, 'not-current', 'ignored');
    expect((await row()).password_hash).not.toBe('ignored');

    const current = (await row()).password_hash;
    await repo.replacePasswordHash(userFixture.id, current, 'rehashed');
    expect((await row()).password_hash).toBe('rehashed');
  });
});
