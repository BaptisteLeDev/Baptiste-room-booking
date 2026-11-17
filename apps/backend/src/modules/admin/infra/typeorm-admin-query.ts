import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../../common/database/paginate.js';
import { ReservationStatus } from '../../reservations/domain/enums/reservation-status.enum.js';
import {
  Reservation,
  type ReservationSnapshot,
} from '../../reservations/domain/reservation.js';
import type {
  AdminQuery,
  AdminReservationFilter,
  AdminStatistics,
  StatisticsFilter,
  TimelineDay,
} from '../domain/repositories/admin-query.port.js';
import { AdminReservationRow } from './admin-reservation-row.entity.js';

const toReservation = (e: AdminReservationRow): Reservation => {
  const snapshot: ReservationSnapshot = {
    id: e.id,
    roomId: e.roomId,
    userId: e.userId,
    startAt: e.startTime.toISOString(),
    endAt: e.endTime.toISOString(),
    status: e.status as ReservationSnapshot['status'],
    ...(e.numberOfParticipants !== null && {
      numberOfParticipants: e.numberOfParticipants,
    }),
    ...(e.comment !== null && { comment: e.comment }),
    totalAmount: e.totalAmount,
    currency: e.currency,
    createdAt: e.createdAt.toISOString(),
  };
  return Reservation.restore(snapshot);
};

@Injectable()
export class TypeOrmAdminQuery implements AdminQuery {
  constructor(
    @InjectRepository(AdminReservationRow)
    private readonly reservations: Repository<AdminReservationRow>,
    private readonly dataSource: DataSource,
  ) {}

  async listReservations(filter: AdminReservationFilter) {
    const qb = this.reservations
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id');
    if (filter.status)
      qb.andWhere('r.status = :status', { status: filter.status });
    if (filter.roomId)
      qb.andWhere('r.roomId = :roomId', { roomId: filter.roomId });
    if (filter.userId)
      qb.andWhere('r.userId = :userId', { userId: filter.userId });
    const { items, total } = await paginate(qb, filter.page, filter.pageSize);
    return { items: items.map(toReservation), total };
  }

  private inPeriod(filter: StatisticsFilter) {
    const qb = this.reservations.createQueryBuilder('r');
    if (filter.from) qb.andWhere('r.startTime >= :from', { from: filter.from });
    if (filter.to)
      qb.andWhere("r.startTime < (CAST(:to AS date) + INTERVAL '1 day')", {
        to: filter.to,
      });
    return qb;
  }

  async timeline(filter: StatisticsFilter): Promise<TimelineDay[]> {
    const day = "TO_CHAR(r.startTime AT TIME ZONE 'UTC', 'YYYY-MM-DD')";
    const rows = await this.inPeriod(filter)
      .select(day, 'date')
      .addSelect('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy(day)
      .addGroupBy('r.status')
      .getRawMany<{ date: string; status: ReservationStatus; count: string }>();
    const zero = Object.fromEntries(
      Object.values(ReservationStatus).map((s) => [s, 0]),
    ) as Record<ReservationStatus, number>;
    const days = new Map<string, TimelineDay>();
    for (const row of rows) {
      const entry = days.get(row.date) ?? {
        date: row.date,
        total: 0,
        byStatus: { ...zero },
      };
      const n = Number(row.count);
      entry.byStatus[row.status] = n;
      entry.total += n;
      days.set(row.date, entry);
    }
    return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  async statistics(filter: StatisticsFilter): Promise<AdminStatistics> {
    const base = this.inPeriod(filter);
    const [totalReservations, confirmedReservations, cancelledReservations] =
      await Promise.all([
        base.clone().getCount(),
        base
          .clone()
          .andWhere('r.status = :confirmed', { confirmed: 'CONFIRMED' })
          .getCount(),
        base
          .clone()
          .andWhere('r.status = :cancelled', { cancelled: 'CANCELLED' })
          .getCount(),
      ]);
    const revenue = await base
      .clone()
      .andWhere('r.status IN (:...revenueStatuses)', {
        revenueStatuses: ['CONFIRMED', 'COMPLETED'],
      })
      .select('COALESCE(SUM(r.totalAmount), 0)', 'total')
      .getRawOne<{ total: string }>();
    return {
      totalUsers: await this.count('users'),
      totalRooms: await this.count('rooms'),
      totalReservations,
      confirmedReservations,
      cancelledReservations,
      totalRevenue: Number(revenue?.total ?? 0),
    };
  }

  private async count(table: 'users' | 'rooms'): Promise<number> {
    const [row] = await this.dataSource.query<{ n: string }[]>(
      `SELECT COUNT(*) AS n FROM ${table}`,
    );
    return Number(row?.n ?? 0);
  }
}
