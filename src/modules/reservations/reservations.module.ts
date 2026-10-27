import { Module } from '@nestjs/common';
import { ReservationsController } from './reservations.controller.js';

@Module({
  controllers: [ReservationsController],
})
export class ReservationsModule {}
