import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthResponse, LoginRequest } from '../../../../contract.js';
import { normalizeEmail } from '../../../users/domain/entities/user.entity.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface.js';
import { invalidCredentials } from '../invalid-credentials.js';
import {
  PASSWORD_HASHER,
  type PasswordHasher,
} from '../../domain/password-hasher.js';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/token-issuer.js';

@Injectable()
export class LoginUseCase {
  // Unknown e-mail still pays one verify: no timing oracle on accounts.
  private readonly dummyHash: Promise<string>;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {
    this.dummyHash = hasher.hash(randomUUID());
  }

  async execute(body: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findByEmail(normalizeEmail(body.email));
    const valid = await this.hasher.verify(
      body.password,
      user?.passwordHash ?? (await this.dummyHash),
    );
    if (!user || !valid) {
      throw invalidCredentials();
    }
    // Conditional on the old hash: a concurrent password change wins.
    if (this.hasher.needsRehash(user.passwordHash)) {
      await this.users.replacePasswordHash(
        user.id,
        user.passwordHash,
        await this.hasher.hash(body.password),
      );
    }
    const { token, expiresIn } = await this.tokens.sign(
      user.id,
      user.tokenVersion,
    );
    return { accessToken: token, expiresIn, user: user.toSnapshot() };
  }
}
