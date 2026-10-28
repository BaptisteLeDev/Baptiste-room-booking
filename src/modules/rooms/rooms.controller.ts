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
import { CreateRoomDto } from './dto/create-room.dto.js';
import { GetRoomAvailabilityQueryDto } from './dto/get-room-availability-query.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Public()
  @Get()
  listRooms(@Query() query: ListRoomsQueryDto): Promise<PaginatedRooms> {
    return this.rooms.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(
    @Body() body: CreateRoomDto,
    @CurrentUserId() userId: string,
  ): Promise<Room> {
    return this.rooms.create(userId, body);
  }

  @Public()
  @Get(':roomId')
  getRoom(@Param('roomId', ParseUUIDPipe) roomId: string): Promise<Room> {
    return this.rooms.get(roomId);
  }

  @Patch(':roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateRoomDto,
    @CurrentUserId() userId: string,
  ): Promise<Room> {
    return this.rooms.update(roomId, userId, body);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.rooms.delete(roomId, userId);
  }

  @Public()
  @Get(':roomId/availability')
  getRoomAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query() query: GetRoomAvailabilityQueryDto,
  ): Promise<AvailabilitySlot[]> {
    return this.rooms.getAvailability(roomId, query);
  }

  @Put(':roomId/availability')
  setRoomAvailability(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateAvailabilityDto,
    @CurrentUserId() userId: string,
  ): Promise<AvailabilitySlot[]> {
    return this.rooms.setAvailability(roomId, userId, body);
  }
}
