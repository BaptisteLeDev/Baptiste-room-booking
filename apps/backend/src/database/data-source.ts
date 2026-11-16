import { DataSource, type DataSourceOptions } from 'typeorm';
import { requiredEnv } from '../common/env.js';
import { UserEntity } from '../modules/users/infra/user.entity.js';
import { RevokedTokenEntity } from '../modules/auth/infra/revoked-token.entity.js';
import { RoomEntity } from '../modules/rooms/infra/room.entity.js';
import { AvailabilityEntity } from '../modules/rooms/infra/availability.entity.js';
import { ReservationEntity } from '../modules/reservations/infra/reservation.entity.js';
import { RoomRow } from '../modules/reservations/infra/room-row.entity.js';
import { UserRow } from '../modules/reservations/infra/user-row.entity.js';
import { AdminReservationRow } from '../modules/admin/infra/admin-reservation-row.entity.js';
import { PaymentEntity } from '../modules/payments/infra/payment.entity.js';
import { ReservationRow } from '../modules/payments/infra/reservation-row.entity.js';
import { OwnerRow } from '../modules/rooms/infra/owner-row.entity.js';
import { InitSchema1793106343582 } from './migrations/1793106343582-InitSchema.js';
import { AddAvailabilityAvailable1793106500000 } from './migrations/1793106500000-AddAvailabilityAvailable.js';
import { SeedDemoUser1793106400000 } from './migrations/1793106400000-SeedDemoUser.js';
import { AddUserPasswordChangedAt1793196619708 } from './migrations/1793196619708-AddUserPasswordChangedAt.js';
import { RenameReservationStatuses1793300000000 } from './migrations/1793300000000-RenameReservationStatuses.js';
import { AddAuthTokenHardening1793400000000 } from './migrations/1793400000000-AddAuthTokenHardening.js';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: requiredEnv('DB_USER'),
  password: requiredEnv('DB_PASSWORD'),
  database: process.env.DB_NAME ?? 'resa_db',
  entities: [
    UserEntity,
    RevokedTokenEntity,
    RoomEntity,
    AvailabilityEntity,
    ReservationEntity,
    PaymentEntity,
    AdminReservationRow,
    RoomRow,
    UserRow,
    ReservationRow,
    OwnerRow,
  ],
  migrations: [
    InitSchema1793106343582,
    SeedDemoUser1793106400000,
    AddAvailabilityAvailable1793106500000,
    AddUserPasswordChangedAt1793196619708,
    RenameReservationStatuses1793300000000,
    AddAuthTokenHardening1793400000000,
  ],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export default new DataSource(dataSourceOptions);
