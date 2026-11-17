import { Inject, Injectable } from '@nestjs/common';
import type { StatisticsTimeline } from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  ADMIN_QUERY,
  type AdminQuery,
  type StatisticsFilter,
} from '../../domain/repositories/admin-query.port.js';
import { assertDateRange } from '../date-range.js';

@Injectable()
export class TimelineUseCase {
  constructor(
    @Inject(ADMIN_QUERY) private readonly query: AdminQuery,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    requesterId: string,
    filter: StatisticsFilter,
  ): Promise<StatisticsTimeline> {
    await this.authorization.assertAdmin(requesterId);
    assertDateRange(filter);
    return { days: await this.query.timeline(filter) };
  }
}
