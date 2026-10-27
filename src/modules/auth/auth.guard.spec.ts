import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard, AuthenticatedRequest } from './auth.guard.js';
import { Public } from './public.decorator.js';
import { RevokedTokens } from './revoked-tokens.js';

const SECRET = 'test-secret';

function setup() {
  const jwt = new JwtService({ secret: SECRET });
  const revoked = new RevokedTokens();
  const guard = new AuthGuard(jwt, new Reflector(), revoked);
  return { jwt, revoked, guard };
}

function contextFor(
  request: Partial<AuthenticatedRequest>,
  handler: () => void = () => {},
): ExecutionContext {
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => request }),
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
});
