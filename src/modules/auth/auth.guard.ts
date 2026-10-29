import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC } from './public.decorator.js';
import { requestOf } from '../../common/http/request-of.js';
import {
  REVOKED_TOKEN_STORE,
  type RevokedTokenStore,
} from './domain/revoked-token-store.js';
import { TOKEN_ISSUER, type TokenIssuer } from './domain/token-issuer.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../users/domain/repositories/user.repository.interface.js';

export type AuthenticatedRequest = Request & { userId: string; token: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    private readonly reflector: Reflector,
    @Inject(REVOKED_TOKEN_STORE) private readonly revoked: RevokedTokenStore,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = requestOf<AuthenticatedRequest>(context);
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token || this.revoked.isRevoked(token))
      throw new UnauthorizedException();

    let userId: string;
    let issuedAt: number;
    try {
      ({ userId, issuedAt } = await this.tokens.verify(token));
    } catch {
      throw new UnauthorizedException();
    }

    // ponytail: iat has 1s granularity, a token issued in the same second
    // as the change still passes. Upgrade: store a token version claim.
    const user = await this.users.findById(userId);
    const changedAt = user?.passwordChangedAt;
    if (
      !user ||
      (changedAt && issuedAt < Math.floor(changedAt.getTime() / 1000))
    )
      throw new UnauthorizedException();

    request.userId = userId;
    request.token = token;
    return true;
  }
}
