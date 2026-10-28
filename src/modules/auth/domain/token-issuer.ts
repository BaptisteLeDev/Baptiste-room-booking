export type IssuedToken = { token: string; expiresIn: number };
export type VerifiedToken = { userId: string; exp: number };

export interface TokenIssuer {
  sign(userId: string): Promise<IssuedToken>;
  /** Rejects when the token is invalid or expired. */
  verify(token: string): Promise<VerifiedToken>;
}

export const TOKEN_ISSUER = Symbol('TokenIssuer');
