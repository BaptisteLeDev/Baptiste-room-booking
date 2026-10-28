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
import { PaymentsService } from './payments.service.js';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUserId() requesterId: string,
    @Body() body: CreatePaymentDto,
  ): Promise<Payment> {
    return this.payments.create(requesterId, body);
  }

  @Get(':paymentId')
  get(
    @CurrentUserId() requesterId: string,
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<Payment> {
    return this.payments.get(requesterId, paymentId);
  }
}
