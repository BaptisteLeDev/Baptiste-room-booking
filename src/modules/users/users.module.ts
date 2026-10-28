import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case.js';
import { GetUserRoleUseCase } from './application/use-cases/get-user-role.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface.js';
import { TypeOrmUserRepository } from './infra/typeorm-user.repository.js';
import { UserEntity } from './infra/user.entity.js';
import { UsersController } from './users.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), AuthModule],
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetUserRoleUseCase,
    { provide: USER_REPOSITORY, useClass: TypeOrmUserRepository },
  ],
})
export class UsersModule {}
