import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Payment as PaymentDto } from '../../../../contract.js';
import { orNotFound } from '../../../../common/not-found.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
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
export class GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly payments: IPaymentRepository,
    @Inject(RESERVATION_CATALOG) private readonly catalog: ReservationCatalog,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(requesterId: string, id: string): Promise<PaymentDto> {
    const payment = orNotFound(await this.payments.findById(id));
    const reservation = orNotFound(
      await this.catalog.findReservation(payment.reservationId),
    );
    if (
      reservation.userId !== requesterId &&
      !(await this.authorization.isAdmin(requesterId))
    )
      throw new ForbiddenException();
    return toPaymentDto(payment);
  }
}
