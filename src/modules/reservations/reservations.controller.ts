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
import { userFixture } from '../auth/fixtures/user.fixture.js';
import { ReservationsService } from './application/reservations.service.js';
import { CreateReservationDto } from './dto/create-reservation.dto.js';
import { ListReservationsQueryDto } from './dto/list-reservations-query.dto.js';
import { RejectReservationDto } from './dto/reject-reservation.dto.js';
import { UpdateReservationDto } from './dto/update-reservation.dto.js';

// ponytail: until auth guard
const userId = userFixture.id;

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  listReservations(
    @Query() query: ListReservationsQueryDto,
  ): Promise<PaginatedReservations> {
    return this.reservations.listReservations(userId, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createReservation(@Body() body: CreateReservationDto): Promise<Reservation> {
    return this.reservations.createReservation(userId, body);
  }

  @Get(':reservationId')
  getReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<Reservation> {
    return this.reservations.getReservation(reservationId);
  }

  @Patch(':reservationId')
  updateReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() body: UpdateReservationDto,
  ): Promise<Reservation> {
    return this.reservations.updateReservation(reservationId, body);
  }

  @Delete(':reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancelReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<void> {
    return this.reservations.cancelReservation(reservationId);
  }

  @Post(':reservationId/confirm')
  @HttpCode(HttpStatus.OK)
  confirmReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<Reservation> {
    return this.reservations.confirmReservation(reservationId);
  }

  @Post(':reservationId/reject')
  @HttpCode(HttpStatus.OK)
  rejectReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
    @Body() _body: RejectReservationDto,
  ): Promise<Reservation> {
    return this.reservations.rejectReservation(reservationId);
  }
}
