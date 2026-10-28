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
    const all = (await this.repo.list())
      .map((r) => r.toSnapshot())
      .filter(
        (s) =>
          s.userId === userId &&
          (!q.status || s.status === q.status) &&
          (!q.from || s.startAt.slice(0, 10) >= q.from) &&
          (!q.to || s.startAt.slice(0, 10) <= q.to),
      );
    const start = (q.page - 1) * q.pageSize;
    return {
      items: all.slice(start, start + q.pageSize),
      page: q.page,
      pageSize: q.pageSize,
      total: all.length,
    };
  }
}
