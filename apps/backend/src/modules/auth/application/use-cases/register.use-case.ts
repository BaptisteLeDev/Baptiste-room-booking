import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RegisterRequest, User as UserDto } from '../../../../contract.js';
import {
  emailUsed,
  normalizeEmail,
  User,
} from '../../../users/domain/entities/user.entity.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/password-hasher.js';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(body: RegisterRequest): Promise<UserDto> {
    const email = normalizeEmail(body.email);
    if (await this.users.existsByEmail(email)) throw emailUsed();
    const user = User.create({
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      email,
      passwordHash: await this.hasher.hash(body.password),
      firstName: body.firstName,
      lastName: body.lastName,
    });
    return (await this.users.save(user)).toSnapshot();
  }
}
