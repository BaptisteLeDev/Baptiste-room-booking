import { DataSource, type DataSourceOptions } from 'typeorm';
import { UserEntity } from '../modules/users/infra/user.entity.js';
import { RoomEntity } from '../modules/rooms/infra/room.entity.js';
import { AvailabilityEntity } from '../modules/rooms/infra/availability.entity.js';
import { ReservationEntity } from '../modules/reservations/infra/reservation.entity.js';
import { AdminReservationRow } from '../modules/admin/infra/admin-reservation-row.entity.js';
import { PaymentEntity } from '../modules/payments/infra/payment.entity.js';
import { InitSchema1793106343582 } from './migrations/1793106343582-InitSchema.js';
import { AddAvailabilityAvailable1793106500000 } from './migrations/1793106500000-AddAvailabilityAvailable.js';
import { SeedDemoUser1793106400000 } from './migrations/1793106400000-SeedDemoUser.js';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'resa_user',
  password: process.env.DB_PASSWORD ?? 'resa_password',
  database: process.env.DB_NAME ?? 'resa_db',
  entities: [
    UserEntity,
    RoomEntity,
    AvailabilityEntity,
    ReservationEntity,
    PaymentEntity,
    AdminReservationRow,
  ],
  migrations: [
    InitSchema1793106343582,
    SeedDemoUser1793106400000,
    AddAvailabilityAvailable1793106500000,
  ],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export default new DataSource(dataSourceOptions);
