import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import {
  REVOKED_TOKEN_STORE,
  type RevokedTokenStore,
} from '../../domain/revoked-token-store.js';
import { TOKEN_ISSUER, type TokenIssuer } from '../../domain/token-issuer.js';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    @Inject(REVOKED_TOKEN_STORE) private readonly revoked: RevokedTokenStore,
  ) {}

  async execute(token: string): Promise<void> {
    // Token may expire between AuthGuard and here: same 401 as the guard.
    const { exp, jti } = await this.tokens.verify(token).catch(() => {
      throw new UnauthorizedException();
    });
    await this.revoked.revoke(jti, exp);
  }
}
