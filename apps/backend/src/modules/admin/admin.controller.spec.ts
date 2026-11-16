import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AdminController } from './admin.controller.js';
import { ListAdminReservationsUseCase } from './application/use-cases/list-admin-reservations.use-case.js';
import { StatisticsUseCase } from './application/use-cases/statistics.use-case.js';

describe('AdminController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: ListAdminReservationsUseCase, useValue: {} },
        { provide: StatisticsUseCase, useValue: {} },
      ],
    }).compile();
    expect(module.get(AdminController)).toBeDefined();
  });
});
