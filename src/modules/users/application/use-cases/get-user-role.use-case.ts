import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Role } from '../../domain/entities/user.entity.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class GetUserRoleUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async execute(userId: string): Promise<Role> {
    const user = await this.users.findById(userId);
    if (!user) throw new ForbiddenException();
    return user.toSnapshot().role;
  }
}
