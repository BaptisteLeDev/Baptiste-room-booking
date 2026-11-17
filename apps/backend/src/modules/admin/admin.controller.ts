import { Controller, Get, Query } from '@nestjs/common';
import type {
  PaginatedReservations,
  Statistics,
  StatisticsTimeline,
} from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ListAdminReservationsUseCase } from './application/use-cases/list-admin-reservations.use-case.js';
import { StatisticsUseCase } from './application/use-cases/statistics.use-case.js';
import { TimelineUseCase } from './application/use-cases/timeline.use-case.js';
import { ListAdminReservationsQueryDto } from './dto/list-admin-reservations-query.dto.js';
import { StatisticsQueryDto } from './dto/statistics-query.dto.js';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly listAdminReservations: ListAdminReservationsUseCase,
    private readonly getStatistics: StatisticsUseCase,
    private readonly getTimeline: TimelineUseCase,
  ) {}

  @Get('reservations')
  listReservations(
    @CurrentUserId() requesterId: string,
    @Query() query: ListAdminReservationsQueryDto,
  ): Promise<PaginatedReservations> {
    return this.listAdminReservations.execute(requesterId, query);
  }

  @Get('statistics')
  statistics(
    @CurrentUserId() requesterId: string,
    @Query() query: StatisticsQueryDto,
  ): Promise<Statistics> {
    return this.getStatistics.execute(requesterId, query);
  }

  @Get('statistics/timeline')
  timeline(
    @CurrentUserId() requesterId: string,
    @Query() query: StatisticsQueryDto,
  ): Promise<StatisticsTimeline> {
    return this.getTimeline.execute(requesterId, query);
  }
}
