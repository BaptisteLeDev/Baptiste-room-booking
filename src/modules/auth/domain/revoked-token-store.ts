export interface RevokedTokenStore {
  revoke(token: string, expSeconds: number): void;
  isRevoked(token: string): boolean;
}

export const REVOKED_TOKEN_STORE = Symbol('RevokedTokenStore');
