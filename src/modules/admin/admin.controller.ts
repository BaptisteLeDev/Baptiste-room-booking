import { Controller, Get, Query } from '@nestjs/common';
import type { PaginatedReservations, Statistics } from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { AdminService } from './admin.service.js';
import { ListAdminReservationsQueryDto } from './dto/list-admin-reservations-query.dto.js';
import { StatisticsQueryDto } from './dto/statistics-query.dto.js';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('reservations')
  listReservations(
    @CurrentUserId() requesterId: string,
    @Query() query: ListAdminReservationsQueryDto,
  ): Promise<PaginatedReservations> {
    return this.admin.listReservations(requesterId, query);
  }

  @Get('statistics')
  statistics(
    @CurrentUserId() requesterId: string,
    @Query() query: StatisticsQueryDto,
  ): Promise<Statistics> {
    return this.admin.statistics(requesterId, query);
  }
}
