import 'reflect-metadata';
import { check, props } from '../../../common/validation/dto-test-helpers.js';
import type { PaymentCreateRequest } from '../../../contract.js';
import { CreatePaymentDto } from './create-payment.dto.js';

const RESERVATION_ID = '3f2c8a4e-9b1d-4e7a-8c5f-2a6b7d8e9f01';

describe('CreatePaymentDto', () => {
  const valid: PaymentCreateRequest = {
    reservationId: RESERVATION_ID,
    paymentMethod: 'CARD',
  };

  it.each(['CARD', 'PAYPAL'] as const)(
    'accepts paymentMethod %s',
    async (paymentMethod) => {
      expect(
        await check(CreatePaymentDto, { ...valid, paymentMethod }),
      ).toHaveLength(0);
    },
  );

  it.each(['reservationId', 'paymentMethod'])(
    'rejects missing %s',
    async (field) => {
      const errors = await check(CreatePaymentDto, {
        ...valid,
        [field]: undefined,
      });
      expect(props(errors)).toContain(field);
    },
  );

  it('rejects reservationId that is not a uuid', async () => {
    const errors = await check(CreatePaymentDto, {
      ...valid,
      reservationId: 'x',
    });
    expect(props(errors)).toContain('reservationId');
  });

  it('rejects paymentMethod outside enum', async () => {
    const errors = await check(CreatePaymentDto, {
      ...valid,
      paymentMethod: 'CASH',
    });
    expect(props(errors)).toContain('paymentMethod');
  });
});
