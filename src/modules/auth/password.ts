import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;
const KEYLEN = 64;
const SCHEME = 'scrypt';

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEYLEN);
  return `${SCHEME}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== SCHEME) return false;
  const [, saltHex, hashHex] = parts;
  const expected = Buffer.from(hashHex, 'hex');
  if (!saltHex || expected.length !== KEYLEN) return false;
  const actual = await scryptAsync(
    password,
    Buffer.from(saltHex, 'hex'),
    KEYLEN,
  );
  return timingSafeEqual(expected, actual);
}
