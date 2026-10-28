import { describe, expect, it } from 'vitest';
import { User, type UserState } from './user.entity.js';

const base: UserState = {
  passwordHash: 'hash',
  id: 'u1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'CLIENT',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('User', () => {
  it('create normalizes email and defaults role to CLIENT', () => {
    const { role: _role, ...input } = base;
    const user = User.create({ ...input, email: '  Ada@Example.COM ' });
    expect(user.passwordHash).toBe('hash');
    expect(user.toSnapshot()).toMatchObject({
      email: 'ada@example.com',
      role: 'CLIENT',
    });
  });

  it('changeProfile applies defined fields only and normalizes email', () => {
    const user = User.restore(base);
    user.changeProfile({ firstName: 'Grace', email: ' G@X.io ' });
    expect(user.toSnapshot()).toMatchObject({
      firstName: 'Grace',
      lastName: 'Lovelace',
      email: 'g@x.io',
    });
  });

  it('changeRole', () => {
    const user = User.restore(base);
    user.changeRole('ADMINISTRATEUR');
    expect(user.toSnapshot().role).toBe('ADMINISTRATEUR');
  });

  it('changePasswordHash replaces the hash and stamps passwordChangedAt truncated to seconds', () => {
    const user = User.restore(base);
    user.changePasswordHash('new', new Date('2026-10-28T10:00:00.789Z'));
    expect(user.passwordHash).toBe('new');
    expect(user.passwordChangedAt).toEqual(
      new Date('2026-10-28T10:00:00.000Z'),
    );
    expect(user.toState().passwordChangedAt).toBe('2026-10-28T10:00:00.000Z');
    expect(user.toSnapshot()).not.toHaveProperty('passwordChangedAt');
  });

  it('toSnapshot returns a copy', () => {
    const user = User.restore(base);
    user.toSnapshot().firstName = 'X';
    expect(user.toSnapshot().firstName).toBe('Ada');
  });

  it('restore round-trips passwordHash but snapshot hides it', () => {
    const user = User.restore(base);
    expect(user.toState()).toEqual(base);
    expect(user.toSnapshot()).not.toHaveProperty('passwordHash');
  });
});
