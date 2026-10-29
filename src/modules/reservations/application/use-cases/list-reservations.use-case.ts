import { Inject, Injectable } from '@nestjs/common';
import type { ReservationStatus } from '../../../../contract.js';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '../../domain/reservation-repository.js';

export type ReservationListQuery = {
  status?: ReservationStatus;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

@Injectable()
export class ListReservationsUseCase {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly repo: ReservationRepository,
  ) {}

  async execute(userId: string, q: ReservationListQuery) {
    const { items, total } = await this.repo.search({ ...q, userId });
    return {
      items: items.map((r) => r.toSnapshot()),
      page: q.page,
      pageSize: q.pageSize,
      total,
    };
  }
}
