import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import type { Payment } from '../domain/entities/payment.entity.js';
import { paymentAlreadyExists } from '../domain/payment-already-exists.js';
import type { IPaymentRepository } from '../domain/repositories/payment.repository.interface.js';
import { PaymentEntity } from './payment.entity.js';
import { toEntity, toPayment } from './payment.mapper.js';

@Injectable()
export class TypeOrmPaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentEntity)
    private readonly rows: Repository<PaymentEntity>,
  ) {}

  async save(payment: Payment): Promise<Payment> {
    try {
      return toPayment(await this.rows.save(toEntity(payment.toSnapshot())));
    } catch (error) {
      if (hasPgCode(error, PgCode.UNIQUE_VIOLATION))
        throw paymentAlreadyExists();
      throw error;
    }
  }

  async findById(id: string): Promise<Payment | null> {
    const row = await this.rows.findOneBy({ id });
    return row ? toPayment(row) : null;
  }

  existsForReservation(reservationId: string): Promise<boolean> {
    return this.rows.existsBy({ reservationId });
  }
}
