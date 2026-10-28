import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';

describe('PaymentsController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: {} }],
    }).compile();
    expect(module.get(PaymentsController)).toBeDefined();
  });
});
