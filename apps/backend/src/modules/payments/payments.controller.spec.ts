import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { PaymentsController } from './payments.controller.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case.js';

describe('PaymentsController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: CreatePaymentUseCase, useValue: {} },
        { provide: GetPaymentUseCase, useValue: {} },
      ],
    }).compile();
    expect(module.get(PaymentsController)).toBeDefined();
  });
});
