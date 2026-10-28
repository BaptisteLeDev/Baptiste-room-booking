import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationEntity } from '../reservations/infra/reservation.entity.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsService } from './rooms.service.js';
import { AvailabilityEntity } from './infra/availability.entity.js';
import { RoomEntity } from './infra/room.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoomEntity,
      AvailabilityEntity,
      ReservationEntity,
    ]),
    AuthModule,
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
