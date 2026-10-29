import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, AuthenticatedRequest } from './auth.guard.js';
import { Public } from './public.decorator.js';
import { JwtTokenIssuer } from './infra/jwt.token-issuer.js';
import { InMemoryRevokedTokenStore } from './infra/in-memory-revoked-tokens.store.js';
import { User } from '../users/domain/entities/user.entity.js';
import type { IUserRepository } from '../users/domain/repositories/user.repository.interface.js';

const SECRET = 'test-secret';
const NOW = Math.floor(Date.now() / 1000);
const CHANGED_AT_SECONDS = NOW - 60;
const CHANGED_AT = new Date(CHANGED_AT_SECONDS * 1000).toISOString();

const baseUser = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'CLIENT' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  passwordHash: 'hash',
};

function setup(user: User | null = User.restore(baseUser)) {
  const jwt = new JwtService({ secret: SECRET });
  const revoked = new InMemoryRevokedTokenStore();
  const users = {
    findById: async () => user,
  } as unknown as IUserRepository;
  const guard = new AuthGuard(
    new JwtTokenIssuer(jwt),
    new Reflector(),
    revoked,
    users,
  );
  return { jwt, revoked, guard };
}

function contextFor(
  request: Partial<AuthenticatedRequest>,
  handler: () => void = () => {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class {},
    getType: () => 'http',
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({}),
    }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  it('lets a public handler through without a header', async () => {
    const { guard } = setup();
    const handler = Public()(() => {}) as () => void;

    await expect(
      guard.canActivate(contextFor({ headers: {} }, handler)),
    ).resolves.toBe(true);
  });

  it('rejects a request without a bearer header', async () => {
    const { guard } = setup();

    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a garbage token', async () => {
    const { guard } = setup();
    const request = { headers: { authorization: 'Bearer not-a-jwt' } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a revoked valid token', async () => {
    const { guard, jwt, revoked } = setup();
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: 3600 });
    revoked.revoke(token, Math.floor(Date.now() / 1000) + 3600);
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts a valid token and sets userId and token', async () => {
    const { guard, jwt } = setup();
    const token = await jwt.signAsync({ sub: 'user-1' }, { expiresIn: 3600 });
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: `Bearer ${token}` },
    };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.userId).toBe('user-1');
    expect(request.token).toBe(token);
  });

  it('rejects a token issued before the last password change', async () => {
    const { guard, jwt } = setup(
      User.restore({ ...baseUser, passwordChangedAt: CHANGED_AT }),
    );
    const token = await jwt.signAsync(
      { sub: 'user-1', iat: CHANGED_AT_SECONDS - 1 },
      { expiresIn: 3600 },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('accepts a token issued in the same second as the password change', async () => {
    const { guard, jwt } = setup(
      User.restore({ ...baseUser, passwordChangedAt: CHANGED_AT }),
    );
    const token = await jwt.signAsync(
      { sub: 'user-1', iat: CHANGED_AT_SECONDS },
      { expiresIn: 3600 },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });

  it('accepts a token issued after the last password change', async () => {
    const { guard, jwt } = setup(
      User.restore({ ...baseUser, passwordChangedAt: CHANGED_AT }),
    );
    const token = await jwt.signAsync(
      { sub: 'user-1', iat: CHANGED_AT_SECONDS + 1 },
      { expiresIn: 3600 },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
  });

  it('rejects a token without an iat claim', async () => {
    const { guard, jwt } = setup(User.restore(baseUser));
    const token = await jwt.signAsync(
      { sub: 'user-1' },
      { expiresIn: 3600, noTimestamp: true },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const { guard, jwt } = setup(null);
    const token = await jwt.signAsync(
      { sub: 'ghost', iat: NOW },
      { expiresIn: 3600 },
    );
    const request = { headers: { authorization: `Bearer ${token}` } };

    await expect(guard.canActivate(contextFor(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
