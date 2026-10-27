import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { setupApp } from '../src/setup-app.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';

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
  await dataSource.query(
    'TRUNCATE payments, reservations, availabilities, rooms RESTART IDENTITY CASCADE',
  );
  await dataSource.query('DELETE FROM users WHERE id <> $1', [userFixture.id]);
}
