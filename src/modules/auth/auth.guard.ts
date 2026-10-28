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
import {
  REVOKED_TOKEN_STORE,
  type RevokedTokenStore,
} from './domain/revoked-token-store.js';
import { TOKEN_ISSUER, type TokenIssuer } from './domain/token-issuer.js';

export type AuthenticatedRequest = Request & { userId: string; token: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(TOKEN_ISSUER) private readonly tokens: TokenIssuer,
    private readonly reflector: Reflector,
    @Inject(REVOKED_TOKEN_STORE) private readonly revoked: RevokedTokenStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token || this.revoked.isRevoked(token))
      throw new UnauthorizedException();

    let userId: string;
    try {
      ({ userId } = await this.tokens.verify(token));
    } catch {
      throw new UnauthorizedException();
    }

    request.userId = userId;
    request.token = token;
    return true;
  }
}
