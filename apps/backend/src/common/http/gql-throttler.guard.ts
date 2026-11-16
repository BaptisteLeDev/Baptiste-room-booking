import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { requestOf, responseOf } from './request-of.js';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext): {
    req: Request;
    res: Response;
  } {
    return { req: requestOf(context), res: responseOf(context) };
  }
}
