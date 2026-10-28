import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type {
  User as UserDto,
  UserUpdateRequest,
} from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/authorization.service.js';
import {
  emailUsed,
  normalizeEmail,
} from '../../domain/entities/user.entity.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface.js';
import { loadUser } from '../load-user.js';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    requesterId: string,
    id: string,
    changes: UserUpdateRequest,
  ): Promise<UserDto> {
    const isAdmin = await this.authorization.requireSelfOrAdmin(
      requesterId,
      id,
    );
    if (changes.role !== undefined && !isAdmin) throw new ForbiddenException();
    const user = await loadUser(this.users, id);
    if (
      changes.email !== undefined &&
      normalizeEmail(changes.email) !== user.email &&
      (await this.users.existsByEmail(normalizeEmail(changes.email)))
    )
      throw emailUsed();
    user.changeProfile(changes);
    if (changes.role !== undefined) user.changeRole(changes.role);
    return (await this.users.save(user)).toSnapshot();
  }
}
