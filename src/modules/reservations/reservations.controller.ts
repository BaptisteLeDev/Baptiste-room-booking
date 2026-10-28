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
import { ReservationsService } from './application/reservations.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  listReservations(
    @Query() query: ListReservationsQueryDto,
    @CurrentUserId() userId: string,
  ): Promise<PaginatedReservations> {
    return this.reservations.listReservations(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createReservation(
    @Body() body: CreateReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.reservations.createReservation(userId, body);
  }

  @Get(':reservationId')
  getReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.reservations.getReservation(reservationId, userId);
  }

  @Patch(':reservationId')
  updateReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.reservations.updateReservation(reservationId, userId, body);
  }

  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.reservations.cancelReservation(reservationId, userId);
  }

  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  confirmReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.reservations.confirmReservation(reservationId, userId);
  }

  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  rejectReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() _body: RejectReservationDto,
    @CurrentUserId() userId: string,
  ): Promise<Reservation> {
    return this.reservations.rejectReservation(reservationId, userId);
  }
}
