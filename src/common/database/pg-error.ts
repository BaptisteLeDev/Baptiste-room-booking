import { QueryFailedError } from 'typeorm';

export const hasPgCode = (e: unknown, code: string): boolean =>
  e instanceof QueryFailedError &&
  (e.driverError as { code?: string }).code === code;

export const PgCode = {
  UNIQUE_VIOLATION: '23505',
  FK_VIOLATION: '23503',
  EXCLUSION_VIOLATION: '23P01',
} as const;
