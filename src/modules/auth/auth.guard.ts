import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC } from './public.decorator.js';
import { RevokedTokens } from './revoked-tokens.js';

export type AuthenticatedRequest = Request & { userId: string; token: string };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly revoked: RevokedTokens,
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
    if (!token || this.revoked.has(token)) throw new UnauthorizedException();

    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync<{ sub: string }>(token);
    } catch {
      throw new UnauthorizedException();
    }

    request.userId = payload.sub;
    request.token = token;
    return true;
  }
}
