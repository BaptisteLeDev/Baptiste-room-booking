import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Role } from '../../users/domain/entities/user.entity.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../users/domain/repositories/user.repository.interface.js';

@Injectable()
export class AuthorizationService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async role(userId: string): Promise<Role> {
    const user = await this.users.findById(userId);
    if (!user) throw new ForbiddenException();
    return user.toSnapshot().role;
  }

  async isAdmin(userId: string): Promise<boolean> {
    return (await this.role(userId)) === 'ADMINISTRATEUR';
  }

  async assertAdmin(userId: string): Promise<void> {
    if (!(await this.isAdmin(userId))) throw new ForbiddenException();
  }

  async assertManager(userId: string): Promise<void> {
    if ((await this.role(userId)) === 'CLIENT') throw new ForbiddenException();
  }

  async assertOwnerOrAdmin(userId: string, ownerId: string): Promise<void> {
    if (userId !== ownerId) await this.assertAdmin(userId);
  }

  /** Returns whether the requester is an admin. */
  async requireSelfOrAdmin(userId: string, targetId: string): Promise<boolean> {
    const admin = await this.isAdmin(userId);
    if (userId !== targetId && !admin) throw new ForbiddenException();
    return admin;
  }
}
