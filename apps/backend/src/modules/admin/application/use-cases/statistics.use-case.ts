import { Inject, Injectable } from '@nestjs/common';
import type { Statistics } from '../../../../contract.js';
import { DomainError } from '../../../../common/domain-error.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  ADMIN_QUERY,
  type AdminQuery,
  type StatisticsFilter,
} from '../../domain/repositories/admin-query.port.js';

@Injectable()
export class StatisticsUseCase {
  constructor(
    @Inject(ADMIN_QUERY) private readonly query: AdminQuery,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    requesterId: string,
    filter: StatisticsFilter,
  ): Promise<Statistics> {
    await this.authorization.assertAdmin(requesterId);
    if (filter.from && filter.to && filter.from > filter.to) {
      throw new DomainError(
        'invalid',
        'INVALID_DATE_RANGE',
        'La date de début doit précéder la date de fin.',
      );
    }
    return this.query.statistics(filter);
  }
}
