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
  Put,
  Query,
} from '@nestjs/common';
import type { AvailabilitySlot, PaginatedRooms, Room } from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { Public } from '../auth/public.decorator.js';
import { CreateRoomUseCase } from './application/use-cases/create-room.use-case.js';
import { DeleteRoomUseCase } from './application/use-cases/delete-room.use-case.js';
import { GetRoomAvailabilityUseCase } from './application/use-cases/get-room-availability.use-case.js';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case.js';
import { ListRoomsUseCase } from './application/use-cases/list-rooms.use-case.js';
import { SetRoomAvailabilityUseCase } from './application/use-cases/set-room-availability.use-case.js';
import { UpdateRoomUseCase } from './application/use-cases/update-room.use-case.js';
import { CreateRoomDto } from './dto/create-room.dto.js';
import { GetRoomAvailabilityQueryDto } from './dto/get-room-availability-query.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';

@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly listRoomsUseCase: ListRoomsUseCase,
    private readonly createRoomUseCase: CreateRoomUseCase,
    private readonly getRoomUseCase: GetRoomUseCase,
    private readonly updateRoomUseCase: UpdateRoomUseCase,
    private readonly deleteRoomUseCase: DeleteRoomUseCase,
    private readonly getRoomAvailabilityUseCase: GetRoomAvailabilityUseCase,
    private readonly setRoomAvailabilityUseCase: SetRoomAvailabilityUseCase,
  ) {}

  @Public()
  @Get()
  listRooms(@Query() query: ListRoomsQueryDto): Promise<PaginatedRooms> {
    return this.listRoomsUseCase.execute(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(
    @Body() body: CreateRoomDto,
    @CurrentUserId() userId: string,
  ): Promise<Room> {
    return this.createRoomUseCase.execute(userId, body);
  }

  @Public()
  @Get(':roomId')
  getRoom(@Param('roomId', ParseUUIDPipe) roomId: string): Promise<Room> {
    return this.getRoomUseCase.execute(roomId);
  }

  @Patch(':roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateRoomDto,
    @CurrentUserId() userId: string,
  ): Promise<Room> {
    return this.updateRoomUseCase.execute(roomId, userId, body);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.deleteRoomUseCase.execute(roomId, userId);
  }

  @Public()
  @Get(':roomId/availability')
  getRoomAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetRoomAvailabilityQueryDto,
  ): Promise<AvailabilitySlot[]> {
    return this.getRoomAvailabilityUseCase.execute(roomId, query);
  }

  @Put(':roomId/availability')
  setRoomAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateAvailabilityDto,
    @CurrentUserId() userId: string,
  ): Promise<AvailabilitySlot[]> {
    return this.setRoomAvailabilityUseCase.execute(roomId, userId, body);
  }
}
