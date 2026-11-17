import { Test, TestingModule } from '@nestjs/testing';
import { AuthorizationService } from '../auth/application/authorization.service.js';
import { ReservationAccess } from './application/reservation-access.js';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case.js';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case.js';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case.js';
import { ListReservationsUseCase } from './application/use-cases/list-reservations.use-case.js';
import { RejectReservationUseCase } from './application/use-cases/reject-reservation.use-case.js';
import { SetReservationStatusUseCase } from './application/use-cases/set-reservation-status.use-case.js';
import { UpdateReservationUseCase } from './application/use-cases/update-reservation.use-case.js';
import { RESERVATION_REPOSITORY } from './domain/reservation-repository.js';
import { ROOM_CATALOG } from './domain/room-catalog.js';
import { InMemoryReservationRepository } from '../../../test/helpers/in-memory-reservation.repository.js';
import { ReservationsController } from './reservations.controller.js';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReservationsController],
      providers: [
        ReservationAccess,
        CancelReservationUseCase,
        ConfirmReservationUseCase,
        CreateReservationUseCase,
        GetReservationUseCase,
        ListReservationsUseCase,
        RejectReservationUseCase,
        SetReservationStatusUseCase,
        UpdateReservationUseCase,
        {
          provide: RESERVATION_REPOSITORY,
          useClass: InMemoryReservationRepository,
        },
        { provide: ROOM_CATALOG, useValue: { find: async () => undefined } },
        { provide: AuthorizationService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
