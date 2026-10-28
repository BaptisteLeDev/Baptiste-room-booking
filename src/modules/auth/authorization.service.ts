import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../users/infra/user.entity.js';

@Injectable()
export class AuthorizationService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async role(userId: string): Promise<UserEntity['role']> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new ForbiddenException();
    return user.role;
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
