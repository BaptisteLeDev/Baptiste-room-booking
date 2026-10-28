import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationEntity } from '../reservations/infra/reservation.entity.js';
import { RoomEntity } from '../rooms/infra/room.entity.js';
import { UserEntity } from '../users/infra/user.entity.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReservationEntity, RoomEntity, UserEntity]),
    AuthModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
