import { randomBytes, scryptSync } from 'node:crypto';
import {
  hashPassword,
  passwordNeedsRehash,
  verifyPassword,
} from './scrypt-password-hasher.js';

// Format before params were stored: node defaults N=16384, r=8, p=1.
const legacyHash = (password: string) => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
};

describe('password', () => {
  it('hashes without storing the plain password', async () => {
    const hash = await hashPassword('longenough');
    expect(hash).not.toContain('longenough');
    expect(hash.startsWith('scrypt$')).toBe(true);
  });

  it('stores the current scrypt params in the hash', async () => {
    expect(await hashPassword('longenough')).toMatch(
      /^scrypt\$v2\$131072\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{128}$/,
    );
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

  it('verifies the legacy format without params', async () => {
    const hash = legacyHash('longenough');
    expect(await verifyPassword('longenough', hash)).toBe(true);
    expect(await verifyPassword('wrongpass', hash)).toBe(false);
  });

  it('verifies a v2 hash with the params it carries', async () => {
    const salt = randomBytes(16);
    const hash = scryptSync('longenough', salt, 64, { N: 16384, r: 8, p: 1 });
    const stored = `scrypt$v2$16384$8$1$${salt.toString('hex')}$${hash.toString('hex')}`;
    expect(await verifyPassword('longenough', stored)).toBe(true);
  });

  it('flags legacy and other-param hashes for rehash only', async () => {
    expect(passwordNeedsRehash(legacyHash('longenough'))).toBe(true);
    expect(passwordNeedsRehash(await hashPassword('longenough'))).toBe(false);
    const other = `scrypt$v2$16384$8$1$${'ab'.repeat(16)}$${'cd'.repeat(64)}`;
    expect(passwordNeedsRehash(other)).toBe(true);
  });

  it('rejects a non-scrypt stored value (demo user placeholder)', async () => {
    expect(await verifyPassword('longenough', '!')).toBe(false);
  });

  it('rejects non-numeric params instead of throwing', async () => {
    const stored = `scrypt$v2$x$8$1$${'ab'.repeat(16)}$${'cd'.repeat(64)}`;
    expect(await verifyPassword('longenough', stored)).toBe(false);
  });

  it('rejects a malformed hash that decodes to an empty buffer', async () => {
    const salt = 'ab'.repeat(16);
    expect(await verifyPassword('longenough', `scrypt$${salt}$zz`)).toBe(false);
    expect(await verifyPassword('anything', `scrypt$${salt}$`)).toBe(false);
  });
});
