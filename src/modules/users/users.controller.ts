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
  Query,
} from '@nestjs/common';
import type { PaginatedUsers, User } from '../../contract.js';
import { CurrentUserId } from '../auth/current-user.decorator.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(
    @CurrentUserId() requesterId: string,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsers> {
    return this.users.list(requesterId, query);
  }

  @Get(':userId')
  get(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<User> {
    return this.users.get(requesterId, userId);
  }

  @Patch(':userId')
  update(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<User> {
    return this.users.update(requesterId, userId, body);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.users.remove(requesterId, userId);
  }
}
