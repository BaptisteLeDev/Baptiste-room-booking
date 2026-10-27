import { DomainError } from './domain-error.js';
import { MESSAGES } from './http/api-exception.filter.js';

export const notFound = () =>
  new DomainError('not_found', 'NOT_FOUND', MESSAGES[404]);
