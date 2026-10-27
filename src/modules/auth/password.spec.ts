import { hashPassword, verifyPassword } from './password.js';

describe('password', () => {
  it('hashes without storing the plain password', async () => {
    const hash = await hashPassword('longenough');
    expect(hash).not.toContain('longenough');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('verifies the same password', async () => {
    const hash = await hashPassword('longenough');
    expect(await verifyPassword('longenough', hash)).toBe(true);
  });

  it('rejects another password', async () => {
    const hash = await hashPassword('longenough');
    expect(await verifyPassword('wrongpass', hash)).toBe(false);
  });

  it('salts each hash', async () => {
    const a = await hashPassword('longenough');
    const b = await hashPassword('longenough');
    expect(a).not.toBe(b);
  });

  it('rejects a non-scrypt stored value (demo user placeholder)', async () => {
    expect(await verifyPassword('longenough', '!')).toBe(false);
  });
});
