import { QueryFailedError } from 'typeorm';

export const hasPgCode = (e: unknown, code: string): boolean =>
  e instanceof QueryFailedError &&
  (e.driverError as { code?: string }).code === code;
