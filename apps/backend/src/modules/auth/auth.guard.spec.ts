import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, AuthenticatedRequest } from './auth.guard.js';
import { Public } from './public.decorator.js';
import { JwtTokenIssuer } from './infra/jwt.token-issuer.js';
import { InMemoryRevokedTokens } from './fixtures/in-memory-revoked-tokens.js';
import { User } from '../users/domain/entities/user.entity.js';
import type { IUserRepository } from '../users/domain/repositories/user.repository.interface.js';

const SECRET = 'test-secret-that-is-at-least-32-chars';

const baseUser = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  role: 'CLIENT' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  passwordHash: 'hash',
  tokenVersion: 0,
};

function setup(user: User | null = User.restore(baseUser)) {
  const jwt = new JwtService({ secret: SECRET });
  const tokens = new JwtTokenIssuer(jwt);
  const revoked = new InMemoryRevokedTokens();
  const users = {
    findById: async () => user,
  } as unknown as IUserRepository;
  const guard = new AuthGuard(tokens, new Reflector(), revoked, users);
  return { jwt, tokens, revoked, guard };
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

const bearer = (token: string) => ({
  headers: { authorization: `Bearer ${token}` },
});

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
    const { guard, tokens, revoked } = setup();
    const { token } = await tokens.sign('user-1', 0);
    const { jti } = await tokens.verify(token);
    await revoked.revoke(jti, Math.floor(Date.now() / 1000) + 3600);

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a valid token and sets userId and token', async () => {
    const { guard, tokens } = setup();
    const { token } = await tokens.sign('user-1', 0);
    const request: Partial<AuthenticatedRequest> = bearer(token);

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.userId).toBe('user-1');
    expect(request.token).toBe(token);
  });

  it('rejects a token issued before the password change in the same second', async () => {
    const { guard, tokens } = setup(
      User.restore({ ...baseUser, tokenVersion: 1 }),
    );
    const { token } = await tokens.sign('user-1', 0);

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a token carrying the current token version', async () => {
    const { guard, tokens } = setup(
      User.restore({ ...baseUser, tokenVersion: 1 }),
    );
    const { token } = await tokens.sign('user-1', 1);

    await expect(guard.canActivate(contextFor(bearer(token)))).resolves.toBe(
      true,
    );
  });

  it('rejects a token without a ver claim', async () => {
    const { guard, jwt } = setup();
    const token = await jwt.signAsync(
      { sub: 'user-1', jti: 'j-1' },
      { expiresIn: 3600 },
    );

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token without a jti claim', async () => {
    const { guard, jwt } = setup();
    const token = await jwt.signAsync(
      { sub: 'user-1', ver: 0 },
      { expiresIn: 3600 },
    );

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const { guard, tokens } = setup(null);
    const { token } = await tokens.sign('user-1', 0);

    await expect(
      guard.canActivate(contextFor(bearer(token))),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
