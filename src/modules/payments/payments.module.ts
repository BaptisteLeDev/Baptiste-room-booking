import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case.js';
import { PAYMENT_PROVIDER } from './domain/payment-provider.js';
import { RESERVATION_CATALOG } from './domain/ports/reservation-catalog.port.js';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface.js';
import { DeferredPaymentProvider } from './infra/deferred-payment-provider.js';
import { PaymentEntity } from './infra/payment.entity.js';
import { TypeOrmPaymentRepository } from './infra/typeorm-payment.repository.js';
import { TypeOrmReservationCatalog } from './infra/typeorm-reservation-catalog.js';
import { PaymentsController } from './payments.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), AuthModule],
  controllers: [PaymentsController],
  providers: [
    CreatePaymentUseCase,
    GetPaymentUseCase,
    { provide: PAYMENT_REPOSITORY, useClass: TypeOrmPaymentRepository },
    { provide: RESERVATION_CATALOG, useClass: TypeOrmReservationCatalog },
    { provide: PAYMENT_PROVIDER, useClass: DeferredPaymentProvider },
  ],
})
export class PaymentsModule {}
