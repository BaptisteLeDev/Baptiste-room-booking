import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import { requestOf } from '../../common/http/request-of.js';

export const CurrentUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    requestOf<AuthenticatedRequest>(ctx).userId,
);

export const CurrentToken = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string =>
    requestOf<AuthenticatedRequest>(ctx).token,
);
