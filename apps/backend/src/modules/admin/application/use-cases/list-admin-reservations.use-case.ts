import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedReservations } from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  ADMIN_QUERY,
  type AdminQuery,
  type AdminReservationFilter,
} from '../../domain/repositories/admin-query.port.js';

@Injectable()
export class ListAdminReservationsUseCase {
  constructor(
    @Inject(ADMIN_QUERY) private readonly query: AdminQuery,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    requesterId: string,
    filter: AdminReservationFilter,
  ): Promise<PaginatedReservations> {
    await this.authorization.assertAdmin(requesterId);
    const { items, total } = await this.query.listReservations(filter);
    return {
      page: filter.page,
      pageSize: filter.pageSize,
      total,
      items: items.map((r) => r.toSnapshot()),
    };
  }
}
