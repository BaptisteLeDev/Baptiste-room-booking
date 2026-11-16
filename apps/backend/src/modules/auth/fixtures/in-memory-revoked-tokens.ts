import type { RevokedTokenStore } from '../domain/revoked-token-store.js';

export class InMemoryRevokedTokens implements RevokedTokenStore {
  private readonly jtis = new Set<string>();

  async revoke(jti: string, _expSeconds: number): Promise<void> {
    this.jtis.add(jti);
  }

  async isRevoked(jti: string): Promise<boolean> {
    return this.jtis.has(jti);
  }
}
