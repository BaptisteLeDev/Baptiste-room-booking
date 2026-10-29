import type { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext, type GqlContextType } from '@nestjs/graphql';
import type { Request, Response } from 'express';

type HttpPair = { req: Request; res: Response };

function pairOf(context: ExecutionContext): HttpPair {
  if (context.getType<GqlContextType>() === 'graphql')
    return GqlExecutionContext.create(context).getContext<HttpPair>();
  const http = context.switchToHttp();
  return { req: http.getRequest<Request>(), res: http.getResponse<Response>() };
}

export const requestOf = <T = Request>(context: ExecutionContext): T =>
  pairOf(context).req as T;

export const responseOf = (context: ExecutionContext): Response =>
  pairOf(context).res;
