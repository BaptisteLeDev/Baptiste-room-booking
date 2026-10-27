import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsService } from './application/reservations.service.js';
import { RESERVATION_REPOSITORY } from './domain/reservation-repository.js';
import { ROOM_CATALOG } from './domain/room-catalog.js';
import { InMemoryReservationRepository } from './infra/in-memory-reservation.repository.js';
import { ReservationsController } from './reservations.controller.js';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        ReservationsService,
        {
          provide: RESERVATION_REPOSITORY,
          useClass: InMemoryReservationRepository,
        },
        { provide: ROOM_CATALOG, useValue: { find: async () => undefined } },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
