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
import { availabilitySlotsFixture } from './fixtures/availability-slots.fixture.js';
import { paginatedRoomsFixture } from './fixtures/paginated-rooms.fixture.js';
import { roomFixture } from './fixtures/room.fixture.js';

@Controller('rooms')
export class RoomsController {
  @Get()
  listRooms(@Query() _query: ListRoomsQueryDto): PaginatedRooms {
    return paginatedRoomsFixture;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createRoom(@Body() _body: CreateRoomDto): Room {
    return roomFixture;
  }

  @Get(':roomId')
  getRoom(@Param('roomId', ParseUUIDPipe) _roomId: string): Room {
    return roomFixture;
  }

  @Patch(':roomId')
  updateRoom(
    @Param('roomId', ParseUUIDPipe) _roomId: string,
    @Body() _body: UpdateRoomDto,
  ): Room {
    return roomFixture;
  }

  @Delete(':roomId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteRoom(@Param('roomId', ParseUUIDPipe) _roomId: string): void {}

  @Get(':roomId/availability')
  getRoomAvailability(
    @Param('roomId', ParseUUIDPipe) _roomId: string,
    @Query() _query: GetRoomAvailabilityQueryDto,
  ): AvailabilitySlot[] {
    return availabilitySlotsFixture;
  }

  @Put(':roomId/availability')
  setRoomAvailability(
    @Param('roomId', ParseUUIDPipe) _roomId: string,
    @Body() _body: UpdateAvailabilityDto,
  ): AvailabilitySlot[] {
    return availabilitySlotsFixture;
  }
}
