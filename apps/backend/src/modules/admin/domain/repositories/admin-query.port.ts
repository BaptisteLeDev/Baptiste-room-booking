import type { Reservation } from '../../../reservations/domain/reservation.js';
import type { ReservationStatus } from '../../../../contract.js';

export type AdminReservationFilter = {
  status?: ReservationStatus;
  roomId?: string;
  userId?: string;
  page: number;
  pageSize: number;
};

export type StatisticsFilter = { from?: string; to?: string };

export type AdminStatistics = {
  totalUsers: number;
  totalRooms: number;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  totalRevenue: number;
};

export type TimelineDay = {
  date: string;
  total: number;
  byStatus: Record<ReservationStatus, number>;
};

export interface AdminQuery {
  listReservations(
    filter: AdminReservationFilter,
  ): Promise<{ items: Reservation[]; total: number }>;
  statistics(filter: StatisticsFilter): Promise<AdminStatistics>;
  timeline(filter: StatisticsFilter): Promise<TimelineDay[]>;
}

export const ADMIN_QUERY = Symbol('ADMIN_QUERY');
