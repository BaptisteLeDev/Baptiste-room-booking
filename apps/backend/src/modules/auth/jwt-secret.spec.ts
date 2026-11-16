import { assertJwtSecret } from './jwt-secret.js';

describe('assertJwtSecret', () => {
  it('rejects a missing secret', () => {
    expect(() => assertJwtSecret(undefined)).toThrow('JWT_SECRET is required');
  });

  it('rejects a secret shorter than 32 characters', () => {
    expect(() => assertJwtSecret('x'.repeat(31))).toThrow(
      'at least 32 characters',
    );
  });

  it('accepts a 32 character secret', () => {
    expect(assertJwtSecret('x'.repeat(32))).toBe('x'.repeat(32));
  });
});
