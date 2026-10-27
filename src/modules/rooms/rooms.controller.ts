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
import { CreateRoomDto } from './dto/create-room.dto.js';
import { GetRoomAvailabilityQueryDto } from './dto/get-room-availability-query.dto.js';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto.js';
import { UpdateAvailabilityDto } from './dto/update-availability.dto.js';
import { UpdateRoomDto } from './dto/update-room.dto.js';
import { RoomsService } from './rooms.service.js';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly rooms: RoomsService) {}

  @Get()
  listRooms(@Query() query: ListRoomsQueryDto): Promise<PaginatedRooms> {
    return this.rooms.list(query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(@Body() body: CreateRoomDto): Promise<Room> {
    return this.rooms.create(body);
  }

  @Get(':roomId')
  getRoom(@Param('roomId', ParseUUIDPipe) roomId: string): Promise<Room> {
    return this.rooms.get(roomId);
  }

  @Patch(':roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Body() body: UpdateRoomDto,
  ): Promise<Room> {
    return this.rooms.update(roomId, body);
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoom(@Param('roomId', ParseUUIDPipe) roomId: string): Promise<void> {
    return this.rooms.delete(roomId);
  }

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
  ): Promise<AvailabilitySlot[]> {
    return this.rooms.setAvailability(roomId, body);
  }
}
