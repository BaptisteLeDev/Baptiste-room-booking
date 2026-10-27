import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
  ],
  controllers: [RoomsController],
  providers: [RoomsService],
})
export class RoomsModule {}
