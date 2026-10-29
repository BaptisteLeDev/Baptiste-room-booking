export interface RevokedTokenStore {
  revoke(jti: string, expSeconds: number): Promise<void>;
  isRevoked(jti: string): Promise<boolean>;
}

export const REVOKED_TOKEN_STORE = Symbol('RevokedTokenStore');
