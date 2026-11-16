import { describe, expect, it } from 'vitest';
import { toDomain, toEntity } from './user.mapper.js';
import { UserEntity } from './user.entity.js';

const row = Object.assign(new UserEntity(), {
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  passwordHash: 'secret-hash',
  role: 'CLIENT',
  createdAt: new Date('2026-01-01T00:00:00Z'),
});

describe('user.mapper', () => {
  it('toDomain then toEntity preserves passwordHash', () => {
    expect(toEntity(toDomain(row).toState()).passwordHash).toBe('secret-hash');
  });
});
