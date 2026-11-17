import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { AdminController } from './admin.controller.js';
import { ListAdminReservationsUseCase } from './application/use-cases/list-admin-reservations.use-case.js';
import { StatisticsUseCase } from './application/use-cases/statistics.use-case.js';
import { TimelineUseCase } from './application/use-cases/timeline.use-case.js';
import { ADMIN_QUERY } from './domain/repositories/admin-query.port.js';
import { AdminReservationRow } from './infra/admin-reservation-row.entity.js';
import { TypeOrmAdminQuery } from './infra/typeorm-admin-query.js';

@Module({
  imports: [TypeOrmModule.forFeature([AdminReservationRow]), AuthModule],
  controllers: [AdminController],
  providers: [
    ListAdminReservationsUseCase,
    StatisticsUseCase,
    TimelineUseCase,
    { provide: ADMIN_QUERY, useClass: TypeOrmAdminQuery },
  ],
})
export class AdminModule {}
