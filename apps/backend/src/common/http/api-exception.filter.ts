import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { GqlContextType } from '@nestjs/graphql';
import type { Response } from 'express';
import { GraphQLError } from 'graphql';
import type { ApiError } from '../../contract.js';
import { DomainError } from '../domain-error.js';

export const VALIDATION_ERROR_CODE = 'VALIDATION_ERROR';

export const MESSAGES: Record<number, string> = {
  400: 'Les données fournies sont invalides.',
  401: 'Authentification requise.',
  403: 'Accès interdit.',
  404: 'Ressource introuvable.',
  406: 'Format de réponse non supporté.',
  409: "Conflit avec l'état actuel de la ressource.",
  429: 'Trop de requêtes, réessayez plus tard.',
};

const INTERNAL: ApiError = {
  code: 'INTERNAL_ERROR',
  message: 'Une erreur interne est survenue.',
};

const DOMAIN_STATUS = { invalid: 400, not_found: 404, conflict: 409 } as const;

function fromStatus(status: number): ApiError {
  return {
    code:
      status === 400
        ? VALIDATION_ERROR_CODE
        : (HttpStatus[status] ?? 'HTTP_ERROR'),
    message: MESSAGES[status] ?? 'Une erreur est survenue.',
  };
}

function isCoded(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiError).code === 'string' &&
    typeof (value as ApiError).message === 'string'
  );
}

export function toApiError(exception: unknown): {
  status: number;
  body: ApiError;
} {
  if (exception instanceof DomainError) {
    return {
      status: DOMAIN_STATUS[exception.kind],
      body: { code: exception.code, message: exception.message },
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const res = exception.getResponse();
    if (status >= 500) return { status, body: INTERNAL };
    return { status, body: isCoded(res) ? res : fromStatus(status) };
  }
  // body-parser errors (http-errors) are not HttpException
  const status = (exception as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { status, body: fromStatus(status) };
  }
  return { status: 500, body: INTERNAL };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): GraphQLError | void {
    const { status, body } = toApiError(exception);
    if (status >= 500) Logger.error(exception, undefined, 'ApiExceptionFilter');
    if (host.getType<GqlContextType>() === 'graphql') {
      const { code, message, details } = body;
      return new GraphQLError(message, {
        extensions: { code, status, ...(details && { details }) },
      });
    }
    host.switchToHttp().getResponse<Response>().status(status).json(body);
  }
}
