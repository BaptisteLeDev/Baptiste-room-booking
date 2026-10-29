import { Injectable } from '@nestjs/common';
import type { PasswordHasher } from '../domain/password-hasher.js';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

type ScryptParams = { N: number; r: number; p: number };

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptParams & { maxmem: number },
) => Promise<Buffer>;
const KEYLEN = 64;
const MAXMEM = 256 * 1024 * 1024;
const SCHEME = 'scrypt';
const VERSION = 'v2';
// Node defaults: the legacy `scrypt$salt$hash` format used these.
const LEGACY: ScryptParams = { N: 16384, r: 8, p: 1 };
const CURRENT: ScryptParams = { N: 2 ** 17, r: 8, p: 1 };

const derive = (password: string, salt: Buffer, params: ScryptParams) =>
  scryptAsync(password, salt, KEYLEN, { ...params, maxmem: MAXMEM });

function parse(
  stored: string,
): { params: ScryptParams; salt: string; hash: string } | undefined {
  const parts = stored.split('$');
  if (parts[0] !== SCHEME) return undefined;
  if (parts.length === 3)
    return { params: LEGACY, salt: parts[1], hash: parts[2] };
  if (parts.length !== 7 || parts[1] !== VERSION) return undefined;
  const [N, r, p] = parts.slice(2, 5).map(Number);
  if (![N, r, p].every((n) => Number.isSafeInteger(n) && n > 0))
    return undefined;
  return { params: { N, r, p }, salt: parts[5], hash: parts[6] };
}

// `params` exists for tests: the default costs ~0.5s per call.
export async function hashPassword(
  password: string,
  params: ScryptParams = CURRENT,
): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, params);
  const { N, r, p } = params;
  return `${SCHEME}$${VERSION}$${N}$${r}$${p}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;
  const expected = Buffer.from(parsed.hash, 'hex');
  if (!parsed.salt || expected.length !== KEYLEN) return false;
  const salt = Buffer.from(parsed.salt, 'hex');
  const actual = await derive(password, salt, parsed.params);
  // Every verify costs LEGACY + CURRENT: legacy accounts must not answer
  // faster than the unknown-email dummy. ponytail: drop once none remain.
  await derive(password, salt, isCurrent(parsed.params) ? LEGACY : CURRENT);
  return timingSafeEqual(expected, actual);
}

const isCurrent = ({ N, r, p }: ScryptParams) =>
  N === CURRENT.N && r === CURRENT.r && p === CURRENT.p;

export function passwordNeedsRehash(stored: string): boolean {
  const parsed = parse(stored);
  return !parsed || !isCurrent(parsed.params);
}

@Injectable()
export class ScryptPasswordHasher implements PasswordHasher {
  hash = hashPassword;
  verify = verifyPassword;
  needsRehash = passwordNeedsRehash;
}
