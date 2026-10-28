import { Inject, Injectable } from '@nestjs/common';
import type { ChangePasswordRequest } from '../../../../contract.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface.js';
import { invalidCredentials } from '../invalid-credentials.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/password-hasher.js';

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(userId: string, body: ChangePasswordRequest): Promise<void> {
    const user = await this.users.findById(userId);
    if (
      !user ||
      !(await this.hasher.verify(body.currentPassword, user.passwordHash))
    ) {
      throw invalidCredentials();
    }
    user.changePasswordHash(
      await this.hasher.hash(body.newPassword),
      new Date(),
    );
    await this.users.save(user);
  }
}
