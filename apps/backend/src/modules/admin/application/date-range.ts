import { DomainError } from '../../../common/domain-error.js';
import type { StatisticsFilter } from '../domain/repositories/admin-query.port.js';

export function assertDateRange(filter: StatisticsFilter): void {
  if (filter.from && filter.to && filter.from > filter.to) {
    throw new DomainError(
      'invalid',
      'INVALID_DATE_RANGE',
      'La date de début doit précéder la date de fin.',
    );
  }
}
