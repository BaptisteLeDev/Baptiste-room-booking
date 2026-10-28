import type {
  Reservation,
  ReservationStatus,
} from '../../../reservations/domain/reservation.js';

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

export interface AdminQuery {
  listReservations(
    filter: AdminReservationFilter,
  ): Promise<{ items: Reservation[]; total: number }>;
  statistics(filter: StatisticsFilter): Promise<AdminStatistics>;
}

export const ADMIN_QUERY = Symbol('ADMIN_QUERY');
