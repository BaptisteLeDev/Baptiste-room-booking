import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import { User } from '../../../users/domain/entities/user.entity.js';
import type { IUserRepository } from '../../../users/domain/repositories/user.repository.interface.js';
import type { PasswordHasher } from '../../domain/password-hasher.js';
import type { TokenIssuer } from '../../domain/token-issuer.js';
import { InMemoryRevokedTokenStore } from '../../infra/in-memory-revoked-tokens.store.js';
import { AuthorizationService } from '../authorization.service.js';
import { ChangePasswordUseCase } from './change-password.use-case.js';
import { LoginUseCase } from './login.use-case.js';
import { LogoutUseCase } from './logout.use-case.js';
import { RegisterUseCase } from './register.use-case.js';
import { rejection } from '../../../../../test/helpers/rejection.js';

const ada = (role: 'CLIENT' | 'ADMINISTRATEUR' = 'CLIENT') =>
  User.restore({
    id: 'u1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    passwordHash: 'h:secret',
    role,
    createdAt: '2026-01-01T00:00:00.000Z',
  });

const repo = (users: User[]): IUserRepository & { saved: User[] } => {
  const saved: User[] = [];
  return {
    saved,
    findById: async (id) => users.find((u) => u.id === id) ?? null,
    findByEmail: async (e) => users.find((u) => u.email === e) ?? null,
    existsByEmail: async (e) => users.some((u) => u.email === e),
    save: async (u) => {
      saved.push(u);
      return u;
    },
    delete: async () => true,
    findPage: async () => {
      throw new Error('unused');
    },
  };
};

const hasher: PasswordHasher = {
  hash: async (p) => `h:${p}`,
  verify: async (p, stored) => stored === `h:${p}`,
};

const tokens: TokenIssuer = {
  sign: async (id) => ({ token: `t:${id}`, expiresIn: 3600 }),
  verify: async (t) => ({ userId: t.slice(2), exp: 99, issuedAt: 0 }),
};

describe('auth use cases', () => {
  it('login rejects bad credentials with INVALID_CREDENTIALS', async () => {
    const login = new LoginUseCase(repo([ada()]), hasher, tokens);
    for (const body of [
      { email: 'ada@example.com', password: 'wrong' },
      { email: 'nobody@example.com', password: 'secret' },
    ]) {
      const e = await rejection(login.execute(body));
      expect(e).toBeInstanceOf(UnauthorizedException);
      expect((e as UnauthorizedException).getResponse()).toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    }
  });

  it('login returns token and snapshot without hash', async () => {
    const res = await new LoginUseCase(repo([ada()]), hasher, tokens).execute({
      email: ' ADA@example.com ',
      password: 'secret',
    });
    expect(res).toMatchObject({ accessToken: 't:u1', expiresIn: 3600 });
    expect(res.user).not.toHaveProperty('passwordHash');
  });

  it('register rejects a taken email with EMAIL_ALREADY_USED', async () => {
    const e = await rejection(
      new RegisterUseCase(repo([ada()]), hasher).execute({
        email: 'Ada@example.com',
        password: 'secret',
        firstName: 'A',
        lastName: 'B',
      }),
    );
    expect(e).toBeInstanceOf(DomainError);
    expect((e as DomainError).code).toBe('EMAIL_ALREADY_USED');
  });

  it('register stores a hashed CLIENT', async () => {
    const users = repo([]);
    const res = await new RegisterUseCase(users, hasher).execute({
      email: 'new@example.com',
      password: 'secret',
      firstName: 'N',
      lastName: 'U',
    });
    expect(res.role).toBe('CLIENT');
    expect(users.saved[0].passwordHash).toBe('h:secret');
  });

  it('logout revokes the token until exp', async () => {
    const store = new InMemoryRevokedTokenStore();
    await new LogoutUseCase(tokens, store).execute('t:u1');
    expect(store.isRevoked('t:u1')).toBe(true);
  });

  it('logout maps an expired token to 401', async () => {
    const expired: TokenIssuer = {
      ...tokens,
      verify: () => Promise.reject(new Error('jwt expired')),
    };
    const logout = new LogoutUseCase(expired, new InMemoryRevokedTokenStore());
    expect(await rejection(logout.execute('t:u1'))).toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('change-password checks the current one then stores the new hash', async () => {
    const users = repo([ada()]);
    const useCase = new ChangePasswordUseCase(users, hasher);
    expect(
      await rejection(
        useCase.execute('u1', { currentPassword: 'x', newPassword: 'n' }),
      ),
    ).toBeInstanceOf(UnauthorizedException);
    await useCase.execute('u1', {
      currentPassword: 'secret',
      newPassword: 'fresh',
    });
    expect(users.saved[0].passwordHash).toBe('h:fresh');
  });

  it('authorization: unknown user and CLIENT are forbidden', async () => {
    const authz = new AuthorizationService(repo([ada()]));
    expect(await rejection(authz.assertAdmin('u1'))).toBeInstanceOf(
      ForbiddenException,
    );
    expect(await rejection(authz.assertManager('ghost'))).toBeInstanceOf(
      ForbiddenException,
    );
    await new AuthorizationService(repo([ada('ADMINISTRATEUR')])).assertAdmin(
      'u1',
    );
  });
});
