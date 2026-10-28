import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type {
  IssuedToken,
  TokenIssuer,
  VerifiedToken,
} from '../domain/token-issuer.js';

const TTL_SECONDS = 3600;

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  constructor(private readonly jwt: JwtService) {}

  async sign(userId: string): Promise<IssuedToken> {
    const token = await this.jwt.signAsync(
      { sub: userId, jti: randomUUID() },
      { expiresIn: TTL_SECONDS },
    );
    return { token, expiresIn: TTL_SECONDS };
  }

  async verify(token: string): Promise<VerifiedToken> {
    const { sub, exp, iat } = await this.jwt.verifyAsync<{
      sub: string;
      exp: number;
      iat: number;
    }>(token);
    if (typeof iat !== 'number') throw new Error('token has no iat claim');
    return { userId: sub, exp, issuedAt: iat };
  }
}
