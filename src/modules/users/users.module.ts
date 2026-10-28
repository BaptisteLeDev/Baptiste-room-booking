import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case.js';
import { GetUserRoleUseCase } from './application/use-cases/get-user-role.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { UsersController } from './users.controller.js';
import { UsersPersistenceModule } from './users-persistence.module.js';

@Module({
  imports: [UsersPersistenceModule, AuthModule],
  controllers: [UsersController],
  providers: [
    ListUsersUseCase,
    GetUserUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    GetUserRoleUseCase,
  ],
})
export class UsersModule {}
