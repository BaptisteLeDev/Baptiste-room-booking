import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { In } from 'typeorm';
import dataSource from './data-source.js';
import { hashPassword } from '../modules/auth/infra/scrypt-password-hasher.js';
import { UserEntity } from '../modules/users/infra/user.entity.js';
import { RoomEntity } from '../modules/rooms/infra/room.entity.js';
import { AvailabilityEntity } from '../modules/rooms/infra/availability.entity.js';
import { ReservationEntity } from '../modules/reservations/infra/reservation.entity.js';
import { PaymentEntity } from '../modules/payments/infra/payment.entity.js';

const MOCK_DIR = resolve(process.env.SEED_MOCK_DIR ?? '../frontend/mock/data');
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? 'password123';
const AVAILABILITY_DAYS = 14;

type Slot = { startTime: string; endTime: string; available: boolean };
type MockReservation = Omit<ReservationEntity, 'startTime' | 'endTime'> & {
  startAt: string;
  endAt: string;
};

const load = <T>(name: string): T =>
  JSON.parse(readFileSync(resolve(MOCK_DIR, `${name}.json`), 'utf8')) as T;

// ponytail: slots are UTC, not Europe/Paris; fine for demo data
function availabilities(rooms: RoomEntity[], slots: Slot[]) {
  const today = new Date().toISOString().slice(0, 10);
  const day0 = Date.parse(`${today}T00:00:00Z`);
  return rooms
    .filter((room) => room.status === 'ACTIVE')
    .flatMap((room) =>
      Array.from({ length: AVAILABILITY_DAYS }, (_, d) => {
        const date = new Date(day0 + d * 86_400_000).toISOString().slice(0, 10);
        return slots.map((slot) => ({
          roomId: room.id,
          startTime: new Date(`${date}T${slot.startTime}:00Z`),
          endTime: new Date(`${date}T${slot.endTime}:00Z`),
          available: slot.available,
        }));
      }).flat(),
    );
}

async function seed() {
  const passwordHash = await hashPassword(SEED_PASSWORD);
  const users = load<Omit<UserEntity, 'passwordHash'>[]>('users').map((u) => ({
    ...u,
    passwordHash,
  }));
  const rooms = load<RoomEntity[]>('rooms');
  const reservations = load<MockReservation[]>('reservations').map(
    ({ startAt, endAt, ...r }) => ({
      ...r,
      startTime: new Date(startAt),
      endTime: new Date(endAt),
    }),
  );
  const payments = load<PaymentEntity[]>('payments');
  const slots = load<Slot[]>('availability');

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (em) => {
      // save() upserts by primary key: re-running the seed is safe.
      await em.save(UserEntity, users);
      await em.save(RoomEntity, rooms);
      await em.delete(AvailabilityEntity, {
        roomId: In(rooms.map((r) => r.id)),
      });
      await em.save(AvailabilityEntity, availabilities(rooms, slots));
      await em.save(ReservationEntity, reservations);
      await em.save(PaymentEntity, payments);
    });
    console.log(
      `Seeded ${users.length} users, ${rooms.length} rooms, ${reservations.length} reservations, ${payments.length} payments from ${MOCK_DIR}`,
    );
  } finally {
    await dataSource.destroy();
  }
}

await seed();
