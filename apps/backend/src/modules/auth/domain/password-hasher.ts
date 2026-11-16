export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
  /** True when a stored hash uses outdated params or the legacy format. */
  needsRehash(stored: string): boolean;
}

export const PASSWORD_HASHER = Symbol('PasswordHasher');
