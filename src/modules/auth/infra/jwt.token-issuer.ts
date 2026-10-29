import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IssuedToken,
  TokenIssuer,
  VerifiedToken,
} from '../domain/token-issuer.js';

const TTL_SECONDS = 3600;
// Pinned here: verify must not trust the algorithm named in the header.
const ALGORITHM = 'HS256';

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async sign(userId: string, tokenVersion: number): Promise<IssuedToken> {
    const token = await this.jwt.signAsync(
      { sub: userId, jti: randomUUID(), ver: tokenVersion },
      { expiresIn: TTL_SECONDS, algorithm: ALGORITHM },
    );
    return { token, expiresIn: TTL_SECONDS };
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { sub, exp, jti, ver } = await this.jwt.verifyAsync<{
      sub: string;
      exp: number;
      jti: string;
      ver: number;
    }>(token, { algorithms: [ALGORITHM] });
    if (typeof jti !== 'string' || typeof ver !== 'number')
      throw new Error('token missing jti or ver claim');
    return { userId: sub, exp, jti, tokenVersion: ver };
  }
}
