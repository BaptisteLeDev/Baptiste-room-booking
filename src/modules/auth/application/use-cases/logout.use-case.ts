import { Inject, Injectable } from '@nestjs/common';
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
    const { exp } = await this.tokens.verify(token);
    this.revoked.revoke(token, exp);
  }
}
