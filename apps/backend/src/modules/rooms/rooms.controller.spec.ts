import { Test, TestingModule } from '@nestjs/testing';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case.js';
import { GetRoomAvailabilityUseCase } from './application/use-cases/get-room-availability.use-case.js';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case.js';
import { ListRoomsUseCase } from './application/use-cases/list-rooms.use-case.js';
import { SetRoomAvailabilityUseCase } from './application/use-cases/set-room-availability.use-case.js';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case.js';
import { RoomsController } from './rooms.controller.js';

describe('RoomsController', () => {
  let controller: RoomsController;

  beforeEach(async () => {
    const useCases = [
      ListRoomsUseCase,
      CreateRoomUseCase,
      GetRoomUseCase,
      UpdateRoomUseCase,
      DeleteRoomUseCase,
      GetRoomAvailabilityUseCase,
      SetRoomAvailabilityUseCase,
    ];
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomsController],
      providers: useCases.map((useCase) => ({
        provide: useCase,
        useValue: {},
      })),
    }).compile();

    controller = module.get<RoomsController>(RoomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
