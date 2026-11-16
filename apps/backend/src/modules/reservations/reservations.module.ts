import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationAccess } from './application/reservation-access.js';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case.js';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case.js';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case.js';
import { ListReservationsUseCase } from './application/use-cases/list-reservations.use-case.js';
import { RejectReservationUseCase } from './application/use-cases/reject-reservation.use-case.js';
import { UpdateReservationUseCase } from './application/use-cases/update-reservation.use-case.js';
import { RESERVATION_REPOSITORY } from './domain/reservation-repository.js';
import { ROOM_CATALOG } from './domain/room-catalog.js';
import { ReservationEntity } from './infra/reservation.entity.js';
import { RoomRow } from './infra/room-row.entity.js';
import { TypeOrmReservationRepository } from './infra/typeorm-reservation.repository.js';
import { TypeOrmRoomCatalog } from './infra/typeorm-room-catalog.js';
import { ReservationsController } from './reservations.controller.js';
import { RoomReservationsLoader } from './graphql/room-reservations.loader.js';
import { RoomReservationsResolver } from './graphql/room-reservations.resolver.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity, RoomRow]), AuthModule],
  controllers: [ReservationsController],
  providers: [
    ReservationAccess,
    CancelReservationUseCase,
    ConfirmReservationUseCase,
    CreateReservationUseCase,
    GetReservationUseCase,
    ListReservationsUseCase,
    RejectReservationUseCase,
    UpdateReservationUseCase,
    RoomReservationsLoader,
    RoomReservationsResolver,
    { provide: RESERVATION_REPOSITORY, useClass: TypeOrmReservationRepository },
    { provide: ROOM_CATALOG, useClass: TypeOrmRoomCatalog },
  ],
})
export class ReservationsModule {}
