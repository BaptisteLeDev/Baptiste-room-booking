import {
  BadRequestException,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DomainError } from '../domain-error.js';
import { toApiError } from './api-exception.filter.js';

describe('toApiError', () => {
  it('maps NotFoundException', () => {
    expect(toApiError(new NotFoundException())).toEqual({
      status: 404,
      body: { code: 'NOT_FOUND', message: 'Ressource introuvable.' },
    });
  });

  it('maps BadRequestException to VALIDATION_ERROR', () => {
    const { status, body } = toApiError(
      new BadRequestException('Validation failed (uuid is expected)'),
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Les données fournies sont invalides.',
    });
  });

  it.each([
    ['invalid', 400],
    ['not_found', 404],
    ['conflict', 409],
  ] as const)('maps DomainError %s to %i', (kind, status) => {
    expect(toApiError(new DomainError(kind, 'C', 'm'))).toEqual({
      status,
      body: { code: 'C', message: 'm' },
    });
  });

  it('passes through coded body', () => {
    const payload = { code: 'X', message: 'm', details: { a: 1 } };
    expect(toApiError(new BadRequestException(payload)).body).toEqual(payload);
  });

  it('hides unknown error', () => {
    expect(toApiError(new Error('db password leaked'))).toEqual({
      status: 500,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur interne est survenue.',
      },
    });
  });

  it('maps 5xx HttpException to INTERNAL_ERROR', () => {
    expect(toApiError(new HttpException('boom', 503))).toEqual({
      status: 503,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Une erreur interne est survenue.',
      },
    });
  });

  it('treats http-errors style 4xx as HttpException', () => {
    const err = Object.assign(new Error('bad json'), {
      status: 400,
      type: 'entity.parse.failed',
    });
    expect(toApiError(err)).toEqual({
      status: 400,
      body: {
        code: 'VALIDATION_ERROR',
        message: 'Les données fournies sont invalides.',
      },
    });
  });

  it('has no statusCode key', () => {
    const { body } = toApiError(new NotFoundException());
    expect(Object.keys(body).sort()).toEqual(['code', 'message']);
  });
});
