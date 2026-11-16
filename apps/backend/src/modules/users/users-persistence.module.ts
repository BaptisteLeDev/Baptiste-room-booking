import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { USER_REPOSITORY } from './domain/repositories/user.repository.interface.js';
import { TypeOrmUserRepository } from './infra/typeorm-user.repository.js';
import { UserEntity } from './infra/user.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  providers: [{ provide: USER_REPOSITORY, useClass: TypeOrmUserRepository }],
  exports: [USER_REPOSITORY],
})
export class UsersPersistenceModule {}
