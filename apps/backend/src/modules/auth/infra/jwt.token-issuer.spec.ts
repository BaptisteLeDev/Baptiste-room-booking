import { JwtService } from '@nestjs/jwt';
import { JwtTokenIssuer } from './jwt.token-issuer.js';

const SECRET = 'test-secret-that-is-at-least-32-chars';
const issuer = () => new JwtTokenIssuer(new JwtService({ secret: SECRET }));

describe('JwtTokenIssuer', () => {
  it('signs HS256 and verifies its own token with jti and version', async () => {
    const tokens = issuer();
    const { token } = await tokens.sign('user-1', 2);
    const header = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64url').toString(),
    ) as { alg: string };
    expect(header.alg).toBe('HS256');
    const verified = await tokens.verify(token);
    expect(verified).toMatchObject({ userId: 'user-1', tokenVersion: 2 });
    expect(verified.jti).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rejects a token signed with another HMAC algorithm', async () => {
    const forged = await new JwtService({ secret: SECRET }).signAsync(
      { sub: 'user-1', jti: 'x', ver: 0 },
      { algorithm: 'HS512', expiresIn: 3600 },
    );
    await expect(issuer().verify(forged)).rejects.toThrow();
  });
});
