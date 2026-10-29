import { randomBytes, scryptSync } from 'node:crypto';
import { vi } from 'vitest';

const costs = vi.hoisted(() => [] as number[]);
vi.mock('node:crypto', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:crypto')>();
  return {
    ...real,
    scrypt: (...args: Parameters<typeof real.scrypt>) => {
      costs.push((args[3] as { N: number }).N);
      return (real.scrypt as (...a: unknown[]) => void)(...args);
    },
  };
});

const { hashPassword, verifyPassword } =
  await import('./scrypt-password-hasher.js');

describe('verify cost', () => {
  it('is the same for legacy and current hashes', async () => {
    const salt = randomBytes(16);
    const legacy = `scrypt$${salt.toString('hex')}$${scryptSync('pw', salt, 64).toString('hex')}`;
    const current = await hashPassword('pw');

    costs.length = 0;
    await verifyPassword('pw', legacy);
    const legacyCost = [...costs].sort();
    costs.length = 0;
    await verifyPassword('pw', current);

    expect([...costs].sort()).toEqual(legacyCost);
  });
});
