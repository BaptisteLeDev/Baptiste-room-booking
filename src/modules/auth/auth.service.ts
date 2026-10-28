import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { hasPgCode, PgCode } from '../../common/database/pg-error.js';
import type {
  AuthResponse,
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
  User,
} from '../../contract.js';
import { emailUsed, normalizeEmail, toUser } from '../users/user.mapper.js';
import { UserEntity } from '../users/infra/user.entity.js';
import { hashPassword, verifyPassword } from './password.js';
import { RevokedTokens } from './revoked-tokens.js';

const invalidCredentials = () =>
  new UnauthorizedException({
    code: 'INVALID_CREDENTIALS',
    message: 'Identifiants invalides.',
  });

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
    private readonly revoked: RevokedTokens,
  ) {}

  async register(body: RegisterRequest): Promise<User> {
    const email = normalizeEmail(body.email);
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
      if (hasPgCode(e, PgCode.UNIQUE_VIOLATION)) {
        throw emailUsed();
      }
      throw e;
    }
  }

  async login(body: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findOneBy({
      email: normalizeEmail(body.email),
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw invalidCredentials();
    }
    return {
      accessToken: await this.jwt.signAsync({
        sub: user.id,
        jti: randomUUID(),
      }),
      expiresIn: 3600,
      user: toUser(user),
    };
  }

  async me(userId: string): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw new UnauthorizedException();
    return toUser(user);
  }

  async logout(token: string): Promise<void> {
    const { exp } = this.jwt.decode<{ exp: number }>(token);
    this.revoked.revoke(token, exp);
  }

  async changePassword(
    userId: string,
    body: ChangePasswordRequest,
  ): Promise<void> {
    const user = await this.users.findOneBy({ id: userId });
    if (
      !user ||
      !(await verifyPassword(body.currentPassword, user.passwordHash))
    ) {
      throw invalidCredentials();
    }
    user.passwordHash = await hashPassword(body.newPassword);
    await this.users.save(user);
  }
}
