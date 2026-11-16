import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import type { Payment } from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { CreatePaymentUseCase } from './application/use-cases/create-payment.use-case.js';
import { GetPaymentUseCase } from './application/use-cases/get-payment.use-case.js';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly createPayment: CreatePaymentUseCase,
    private readonly getPayment: GetPaymentUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUserId() requesterId: string,
    @Body() body: CreatePaymentDto,
  ): Promise<Payment> {
    return this.createPayment.execute(requesterId, body);
  }

  @Get(':paymentId')
  get(
    @CurrentUserId() requesterId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<Payment> {
    return this.getPayment.execute(requesterId, paymentId);
  }
}
