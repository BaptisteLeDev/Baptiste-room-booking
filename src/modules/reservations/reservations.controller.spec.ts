import { Test, TestingModule } from '@nestjs/testing';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsModule } from './reservations.module.js';

describe('ReservationsController', () => {
  let controller: ReservationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ReservationsModule],
    }).compile();

    controller = module.get<ReservationsController>(ReservationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
