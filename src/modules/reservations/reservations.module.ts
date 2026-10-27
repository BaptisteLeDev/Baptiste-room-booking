import { Module } from '@nestjs/common';
import { ReservationsService } from './application/reservations.service.js';
import { RESERVATION_REPOSITORY } from './domain/reservation-repository.js';
import { ROOM_CATALOG } from './domain/room-catalog.js';
import { FixtureRoomCatalog } from './infra/fixture-room-catalog.js';
import { InMemoryReservationRepository } from './infra/in-memory-reservation.repository.js';
import { ReservationsController } from './reservations.controller.js';

@Module({
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    {
      provide: RESERVATION_REPOSITORY,
      useClass: InMemoryReservationRepository,
    },
    { provide: ROOM_CATALOG, useClass: FixtureRoomCatalog },
  ],
})
export class ReservationsModule {}
