import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './application/reservations.service.js';
import { RESERVATION_REPOSITORY } from './domain/reservation-repository.js';
import { ROOM_CATALOG } from './domain/room-catalog.js';
import { ReservationEntity } from './infra/reservation.entity.js';
import { TypeOrmReservationRepository } from './infra/typeorm-reservation.repository.js';
import { TypeOrmRoomCatalog } from './infra/typeorm-room-catalog.js';
import { ReservationsController } from './reservations.controller.js';
import { RoomEntity } from '../rooms/infra/room.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReservationEntity, RoomEntity])],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    { provide: RESERVATION_REPOSITORY, useClass: TypeOrmReservationRepository },
    { provide: ROOM_CATALOG, useClass: TypeOrmRoomCatalog },
  ],
})
export class ReservationsModule {}
