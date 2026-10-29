import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case.js';
import { GetRoomAvailabilityUseCase } from './application/use-cases/get-room-availability.use-case.js';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case.js';
import { ListRoomsUseCase } from './application/use-cases/list-rooms.use-case.js';
import { SetRoomAvailabilityUseCase } from './application/use-cases/set-room-availability.use-case.js';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case.js';
import { ROOM_REPOSITORY } from './domain/repositories/room.repository.interface.js';
import { AvailabilityEntity } from './infra/availability.entity.js';
import { RoomEntity } from './infra/room.entity.js';
import { TypeOrmRoomRepository } from './infra/typeorm-room.repository.js';
import { RoomsController } from './rooms.controller.js';
import { RoomsResolver } from './graphql/rooms.resolver.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([RoomEntity, AvailabilityEntity]),
    AuthModule,
  ],
  controllers: [RoomsController],
  providers: [
    CreateRoomUseCase,
    GetRoomUseCase,
    ListRoomsUseCase,
    UpdateRoomUseCase,
    DeleteRoomUseCase,
    GetRoomAvailabilityUseCase,
    SetRoomAvailabilityUseCase,
    RoomsResolver,
    { provide: ROOM_REPOSITORY, useClass: TypeOrmRoomRepository },
  ],
})
export class RoomsModule {}
