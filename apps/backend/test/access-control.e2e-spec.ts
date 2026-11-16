import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type {
  PaginatedReservations,
  Payment,
  Reservation,
  Room,
  RoomCreateRequest,
  User,
} from '../src/contract.js';
import { userFixture } from '../src/modules/auth/fixtures/user.fixture.js';
import {
  createTestApp,
  loginAs,
  openAvailability,
  resetDatabase,
} from './create-app.js';

// BOLA / IDOR (OWASP API1): any authenticated user can send any object id.
// Each route must check ownership on the server. Alice and Bob are both
// CLIENT accounts. Bob is the attacker. Positive controls prove the 404/403
// below come from the check, not from a broken route.

const pad = (n: number) => String(n).padStart(2, '0');
const at = (day: number, hour: number) =>
  `2026-12-${pad(day)}T${pad(hour)}:00:00Z`;

const roomBody: RoomCreateRequest = {
  name: 'Salle Paris',
  capacity: 20,
  location: 'Paris',
  pricePerHour: 45,
};

describe('Object-level authorization (e2e, BOLA / IDOR)', () => {
  let app: INestApplication<App>;
  let manager: string;
  let roomId: string;
  let alice: string;
  let aliceId: string;
  let bob: string;
  let bobId: string;
  let reservationId: string;

  const as = (token: string) =>
    request.agent(app.getHttpServer()).set('Authorization', `Bearer ${token}`);

  const registerAndLogin = async (
    email: string,
  ): Promise<{ token: string; id: string }> => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        firstName: 'Test',
        lastName: 'User',
        email,
        password: 'longenough',
      })
      .expect(201);
    return {
      token: await loginAs(app, email),
      id: (res.body as User).id,
    };
  };

  const countRows = async (table: string): Promise<number> => {
    const rows = await app
      .get(DataSource)
      .query<{ count: string }[]>(`SELECT count(*) FROM ${table}`);
    return Number(rows[0].count);
  };

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await resetDatabase(app);
    manager = await loginAs(app, undefined, 'GESTIONNAIRE');
    const room = await as(manager)
      .post('/api/rooms')
      .send(roomBody)
      .expect(201);
    roomId = (room.body as Room).id;
    await openAvailability(app, manager, roomId);

    ({ token: alice, id: aliceId } =
      await registerAndLogin('alice@example.com'));
    ({ token: bob, id: bobId } = await registerAndLogin('bob@example.com'));

    const res = await as(alice)
      .post('/api/reservations')
      .send({
        roomId,
        startAt: at(1, 9),
        endAt: at(1, 12),
        numberOfParticipants: 4,
        comment: 'Projecteur',
      })
      .expect(201);
    reservationId = (res.body as Reservation).id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('reservations', () => {
    it('owner and room manager can read the reservation (positive control)', async () => {
      await as(alice).get(`/api/reservations/${reservationId}`).expect(200);
      await as(manager).get(`/api/reservations/${reservationId}`).expect(200);
    });

    it('other client GET /:id -> 404, indistinguishable from unknown id', async () => {
      const res = await as(bob)
        .get(`/api/reservations/${reservationId}`)
        .expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
      expect(res.body).not.toHaveProperty('comment');
    });

    it('other client PATCH /:id -> 404, reservation unchanged', async () => {
      await as(bob)
        .patch(`/api/reservations/${reservationId}`)
        .send({ comment: 'pwned' })
        .expect(404);
      const res = await as(alice)
        .get(`/api/reservations/${reservationId}`)
        .expect(200);
      expect(res.body).toMatchObject({ comment: 'Projecteur' });
    });

    it('other client DELETE /:id -> 404, reservation still active', async () => {
      await as(bob).delete(`/api/reservations/${reservationId}`).expect(404);
      const res = await as(alice)
        .get(`/api/reservations/${reservationId}`)
        .expect(200);
      expect(res.body).toMatchObject({ status: 'PENDING_PAYMENT' });
    });

    it('other client confirm and reject -> 404, status unchanged', async () => {
      await as(bob)
        .post(`/api/reservations/${reservationId}/confirm`)
        .expect(404);
      await as(bob)
        .post(`/api/reservations/${reservationId}/reject`)
        .send({})
        .expect(404);
      const res = await as(alice)
        .get(`/api/reservations/${reservationId}`)
        .expect(200);
      expect(res.body).toMatchObject({ status: 'PENDING_PAYMENT' });
    });

    it('owner client confirm -> 403 (client is not the room manager)', async () => {
      await as(alice)
        .post(`/api/reservations/${reservationId}/confirm`)
        .expect(403);
    });

    it('GET list only returns the requester reservations', async () => {
      const res = await as(bob).get('/api/reservations').expect(200);
      const items = (res.body as PaginatedReservations).items as Reservation[];
      expect(items.map((i) => i.id)).not.toContain(reservationId);
    });
  });

  // OWASP API6: business flows must not be abusable by a second account.
  // Regression guard: a slot taken by Alice must stay taken for Bob, and only
  // Alice's own cancel frees it.
  describe('demoted room owner', () => {
    const demote = (role: 'CLIENT' | 'GESTIONNAIRE') =>
      app
        .get(DataSource)
        .query('UPDATE users SET role = $1 WHERE id = $2', [
          role,
          userFixture.id,
        ]);

    beforeEach(async () => {
      await demote('CLIENT');
    });

    it('demoted owner PATCH room -> 403, room unchanged', async () => {
      await as(manager)
        .patch(`/api/rooms/${roomId}`)
        .send({ name: 'pwned' })
        .expect(403);
      const res = await as(manager).get(`/api/rooms/${roomId}`).expect(200);
      expect(res.body).toMatchObject({ name: 'Salle Paris' });
    });

    it('demoted owner PUT availability -> 403, nothing stored', async () => {
      await as(manager)
        .put(`/api/rooms/${roomId}/availability`)
        .send({
          date: '2026-12-01',
          slots: [{ startTime: '09:00', endTime: '12:00', available: true }],
        })
        .expect(403);
      expect(await countRows('availabilities')).toBe(0);
    });

    it('demoted owner DELETE room -> 403, room still exists', async () => {
      await as(manager).delete(`/api/rooms/${roomId}`).expect(403);
      await as(manager).get(`/api/rooms/${roomId}`).expect(200);
    });

    it('demoted owner confirm and reject -> 403, status unchanged', async () => {
      await as(manager)
        .post(`/api/reservations/${reservationId}/confirm`)
        .expect(403);
      await as(manager)
        .post(`/api/reservations/${reservationId}/reject`)
        .send({})
        .expect(403);
      const res = await as(alice)
        .get(`/api/reservations/${reservationId}`)
        .expect(200);
      expect(res.body).toMatchObject({ status: 'PENDING_PAYMENT' });
    });

    it('owner restored to GESTIONNAIRE can confirm (positive control)', async () => {
      await demote('GESTIONNAIRE');
      await as(manager)
        .post(`/api/reservations/${reservationId}/confirm`)
        .expect(200);
    });
  });

  describe('business flows (API6)', () => {
    const bookAlicesSlot = () =>
      as(bob)
        .post('/api/reservations')
        .send({
          roomId,
          startAt: at(1, 9),
          endAt: at(1, 12),
          numberOfParticipants: 2,
        });

    it('other client books slot taken by alice -> 409 SLOT_UNAVAILABLE, alice booking intact', async () => {
      const res = await bookAlicesSlot().expect(409);
      expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
      expect(await countRows('reservations')).toBe(1);
    });

    it('other client cannot cancel alice booking, slot stays taken for third party', async () => {
      await as(bob).delete(`/api/reservations/${reservationId}`).expect(404);
      const res = await bookAlicesSlot().expect(409);
      expect(res.body).toMatchObject({ code: 'SLOT_UNAVAILABLE' });
    });

    it('slot freed only after alice own cancel -> bob can book it', async () => {
      await as(alice).delete(`/api/reservations/${reservationId}`).expect(204);
      await bookAlicesSlot().expect(201);
    });
  });

  describe('payments', () => {
    let paymentId: string;

    beforeEach(async () => {
      const res = await as(alice)
        .post('/api/payments')
        .send({ reservationId, paymentMethod: 'CARD' })
        .expect(201);
      paymentId = (res.body as Payment).id;
    });

    it('owner GET payment -> 200 (positive control)', async () => {
      await as(alice).get(`/api/payments/${paymentId}`).expect(200);
    });

    it('other client GET payment -> 404, same as unknown id (no existence leak)', async () => {
      const res = await as(bob).get(`/api/payments/${paymentId}`).expect(404);
      expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
      expect(res.body).not.toHaveProperty('amount');
    });

    it('other client POST payment on alice reservation -> 403, nothing stored', async () => {
      await as(bob)
        .post('/api/payments')
        .send({ reservationId, paymentMethod: 'PAYPAL' })
        .expect(403);
      expect(await countRows('payments')).toBe(1);
    });
  });

  describe('users', () => {
    it('client GET another user -> 403', async () => {
      await as(bob).get(`/api/users/${aliceId}`).expect(403);
    });

    it('client PATCH another user -> 403, profile unchanged', async () => {
      await as(bob)
        .patch(`/api/users/${aliceId}`)
        .send({ firstName: 'Pwned' })
        .expect(403);
      const res = await as(alice).get('/api/auth/me').expect(200);
      expect(res.body).toMatchObject({ firstName: 'Test' });
    });

    it('client PATCH own role -> 403 (privilege escalation)', async () => {
      await as(bob)
        .patch(`/api/users/${bobId}`)
        .send({ role: 'ADMINISTRATEUR' })
        .expect(403);
      await as(bob).get('/api/admin/reservations').expect(403);
    });

    it('client DELETE another user -> 403, user still exists', async () => {
      await as(bob).delete(`/api/users/${aliceId}`).expect(403);
      await as(alice).get('/api/auth/me').expect(200);
    });

    it('client GET user list -> 403', async () => {
      await as(bob).get('/api/users').expect(403);
    });
  });
});
