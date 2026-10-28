import { Inject, Injectable } from '@nestjs/common';
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
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
  ) {}

  async execute(body: LoginRequest): Promise<AuthResponse> {
    const user = await this.users.findByEmail(normalizeEmail(body.email));
    if (
      !user ||
      !(await this.hasher.verify(body.password, user.passwordHash))
    ) {
      throw invalidCredentials();
    }
    const { token, expiresIn } = await this.tokens.sign(user.id);
    return { accessToken: token, expiresIn, user: user.toSnapshot() };
  }
}
