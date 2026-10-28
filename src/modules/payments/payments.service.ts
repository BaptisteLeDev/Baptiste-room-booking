import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Payment, PaymentCreateRequest } from '../../contract.js';
import { DomainError } from '../../common/domain-error.js';
import { notFound } from '../../common/not-found.js';
import { hasPgCode, PgCode } from '../../common/database/pg-error.js';
import { AuthorizationService } from '../auth/application/authorization.service.js';
import { Repository } from 'typeorm';
import { ReservationEntity } from '../reservations/infra/reservation.entity.js';
import { PaymentEntity } from './infra/payment.entity.js';
import {
  PAYMENT_PROVIDER,
  type PaymentProvider,
} from './domain/payment-provider.js';

const toPayment = (row: PaymentEntity): Payment => ({
  id: row.id,
  reservationId: row.reservationId,
  amount: row.amount,
  currency: row.currency,
  status: row.status as Payment['status'],
  ...(row.paymentUrl !== null && { paymentUrl: row.paymentUrl }),
  createdAt: row.createdAt.toISOString(),
});

const alreadyExists = () =>
  new DomainError(
    'conflict',
    'PAYMENT_ALREADY_EXISTS',
    'Cette réservation possède déjà un paiement.',
  );

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly payments: Repository<PaymentEntity>,
    @InjectRepository(ReservationEntity)
    private readonly reservations: Repository<ReservationEntity>,
    private readonly authorization: AuthorizationService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async create(
    requesterId: string,
    request: PaymentCreateRequest,
  ): Promise<Payment> {
    const reservation = await this.reservations.findOneBy({
      id: request.reservationId,
    });
    if (!reservation) throw notFound();
    if (reservation.userId !== requesterId) {
      throw new ForbiddenException();
    }
    if (await this.payments.existsBy({ reservationId: reservation.id })) {
      throw alreadyExists();
    }
    const initiated = await this.provider.initiate(
      reservation.id,
      reservation.totalAmount,
      reservation.currency,
      request.paymentMethod,
    );
    let saved: PaymentEntity;
    try {
      saved = await this.payments.save(
        this.payments.create({
          reservationId: reservation.id,
          amount: reservation.totalAmount,
          currency: reservation.currency,
          status: initiated.status,
          externalTransactionId: initiated.externalTransactionId,
          paymentUrl: initiated.paymentUrl,
        }),
      );
    } catch (error) {
      if (hasPgCode(error, PgCode.UNIQUE_VIOLATION)) {
        throw alreadyExists();
      }
      throw error;
    }
    return toPayment(saved);
  }

  async get(requesterId: string, id: string): Promise<Payment> {
    const payment = await this.payments.findOneBy({ id });
    if (!payment) throw notFound();
    const reservation = await this.reservations.findOneBy({
      id: payment.reservationId,
    });
    if (!reservation) throw notFound();
    if (
      reservation.userId !== requesterId &&
      (await this.authorization.role(requesterId)) !== 'ADMINISTRATEUR'
    ) {
      throw new ForbiddenException();
    }
    return toPayment(payment);
  }
}
