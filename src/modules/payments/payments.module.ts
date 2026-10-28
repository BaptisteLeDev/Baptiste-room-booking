import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationEntity } from '../reservations/infra/reservation.entity.js';
import { PaymentEntity } from './infra/payment.entity.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import {
  DeferredPaymentProvider,
  PAYMENT_PROVIDER,
} from './domain/payment-provider.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity, ReservationEntity]),
    AuthModule,
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    { provide: PAYMENT_PROVIDER, useClass: DeferredPaymentProvider },
  ],
})
export class PaymentsModule {}
