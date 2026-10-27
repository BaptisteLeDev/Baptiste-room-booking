import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { DomainError } from '../../common/domain-error.js';
import { MESSAGES } from '../../common/http/api-exception.filter.js';
import type { RegisterRequest, User } from '../../contract.js';
import { UserEntity } from '../users/infra/user.entity.js';
import { userFixture } from './fixtures/user.fixture.js';
import { hashPassword } from './password.js';

const UNIQUE_VIOLATION = '23505';

const emailUsed = () =>
  new DomainError(
    'conflict',
    'EMAIL_ALREADY_USED',
    'Cette adresse e-mail est déjà utilisée.',
  );

function toUser(e: UserEntity): User {
  return {
    id: e.id,
    firstName: e.firstName,
    lastName: e.lastName,
    email: e.email,
    role: e.role as User['role'],
    createdAt: e.createdAt.toISOString(),
  };
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async register(body: RegisterRequest): Promise<User> {
    const email = body.email.trim().toLowerCase();
    if (await this.users.existsBy({ email })) throw emailUsed();
    try {
      const saved = await this.users.save(
        this.users.create({
          email,
          passwordHash: await hashPassword(body.password),
          firstName: body.firstName,
          lastName: body.lastName,
          role: 'CLIENT',
        }),
      );
      return toUser(saved);
    } catch (e) {
      if (
        e instanceof QueryFailedError &&
        (e.driverError as { code?: string }).code === UNIQUE_VIOLATION
      ) {
        throw emailUsed();
      }
      throw e;
    }
  }

  async me(): Promise<User> {
    // ponytail: until auth guard
    const user = await this.users.findOneBy({ id: userFixture.id });
    if (!user) throw new DomainError('not_found', 'NOT_FOUND', MESSAGES[404]);
    return toUser(user);
  }
}
