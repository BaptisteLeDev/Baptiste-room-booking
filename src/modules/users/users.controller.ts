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
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly listUsersUseCase: ListUsersUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  @Get()
  list(
    @CurrentUserId() requesterId: string,
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedUsers> {
    return this.listUsersUseCase.execute(requesterId, query);
  }

  @Get(':userId')
  get(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<User> {
    return this.getUserUseCase.execute(requesterId, userId);
  }

  @Patch(':userId')
  update(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateUserDto,
  ): Promise<User> {
    return this.updateUserUseCase.execute(requesterId, userId, body);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() requesterId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    return this.deleteUserUseCase.execute(requesterId, userId);
  }
}
