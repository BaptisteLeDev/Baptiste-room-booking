import { randomUUID } from 'node:crypto';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  Payment as PaymentDto,
  PaymentCreateRequest,
} from '../../../../contract.js';
import { orNotFound } from '../../../../common/not-found.js';
import { Payment } from '../../domain/entities/payment.entity.js';
import { assertPayable } from '../../domain/reservation-not-payable.js';
import { paymentAlreadyExists } from '../../domain/payment-already-exists.js';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from '../../domain/payment-provider.js';
import {
  RESERVATION_CATALOG,
  type ReservationCatalog,
} from '../../domain/ports/reservation-catalog.port.js';
import {
  type IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface.js';
import { toPaymentDto } from '../payment-dto.js';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: IPaymentRepository,
    @Inject(RESERVATION_CATALOG) private readonly catalog: ReservationCatalog,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async execute(
    requesterId: string,
    request: PaymentCreateRequest,
  ): Promise<PaymentDto> {
    const reservation = orNotFound(
      await this.catalog.findReservation(request.reservationId),
    );
    if (reservation.userId !== requesterId) throw new ForbiddenException();
    assertPayable(reservation);
    if (await this.payments.existsForReservation(reservation.id))
      throw paymentAlreadyExists();
    const initiated = await this.provider.initiate(
      reservation.id,
      reservation.amount,
      reservation.currency,
      request.paymentMethod,
    );
    const payment = Payment.create({
      id: randomUUID(),
      reservationId: reservation.id,
      externalTransactionId: initiated.externalTransactionId,
      amount: reservation.amount,
      currency: reservation.currency,
      status: initiated.status,
      paymentUrl: initiated.paymentUrl,
      createdAt: new Date().toISOString(),
    });
    return toPaymentDto(await this.payments.save(payment));
  }
}
