import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, it } from 'vitest';
import { createTestApp } from './create-app.js';

describe('error format (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('unknown route -> 404 NOT_FOUND', async () => {
    const res = await request(app.getHttpServer()).get('/api/nope').expect(404);
    expect(res.body).toEqual({
      code: 'NOT_FOUND',
      message: 'Ressource introuvable.',
    });
  });

  it('bad uuid -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/reservations/not-a-uuid')
      .expect(400);
    expect(res.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Les données fournies sont invalides.',
    });
  });

  it('malformed JSON -> 400 VALIDATION_ERROR', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reservations')
      .set('Content-Type', 'application/json')
      .send('{bad')
      .expect(400);
    expect(res.body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Les données fournies sont invalides.',
    });
  });

  it('invalid body -> details.fields per field', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/reservations')
      .send({
        roomId: 'not-a-uuid',
        startAt: '2026-11-02T09:00:00Z',
        endAt: '2026-11-02T10:00:00Z',
        unknownField: 1,
      })
      .expect(400);
    const body = res.body as {
      code: string;
      details: { fields: Record<string, string[]> };
    };
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(body.details.fields.roomId)).toBe(true);
    expect(body.details.fields.unknownField).toBeDefined();
  });
});
