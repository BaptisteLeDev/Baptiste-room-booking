import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { PaginatedReservations, Reservation } from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation.use-case.js';
import { ConfirmReservationUseCase } from './application/use-cases/confirm-reservation.use-case.js';
import { CreateReservationUseCase } from './application/use-cases/create-reservation.use-case.js';
import { GetReservationUseCase } from './application/use-cases/get-reservation.use-case.js';
import { ListReservationsUseCase } from './application/use-cases/list-reservations.use-case.js';
import { RejectReservationUseCase } from './application/use-cases/reject-reservation.use-case.js';
import { UpdateReservationUseCase } from './application/use-cases/update-reservation.use-case.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly listUseCase: ListReservationsUseCase,
    private readonly createUseCase: CreateReservationUseCase,
    private readonly getUseCase: GetReservationUseCase,
    private readonly updateUseCase: UpdateReservationUseCase,
    private readonly cancelUseCase: CancelReservationUseCase,
    private readonly confirmUseCase: ConfirmReservationUseCase,
    private readonly rejectUseCase: RejectReservationUseCase,
  ) {}

  @Get()
  listReservations(
    @Query() query: ListReservationsQueryDto,
    @CurrentUserId() userId: string,
  ): Promise<PaginatedReservations> {
    return this.listUseCase.execute(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createReservation(
    @Body() body: CreateReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.createUseCase.execute(userId, body);
  }

  @Get(':reservationId')
  getReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.getUseCase.execute(reservationId, userId);
  }

  @Patch(':reservationId')
  updateReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.updateUseCase.execute(reservationId, userId, body);
  }

  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.cancelUseCase.execute(reservationId, userId);
  }

  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  confirmReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.confirmUseCase.execute(reservationId, userId);
  }

  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  rejectReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() _body: RejectReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.rejectUseCase.execute(reservationId, userId);
  }
}
