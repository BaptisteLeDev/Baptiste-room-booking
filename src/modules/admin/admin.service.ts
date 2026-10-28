import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginatedReservations, Statistics } from '../../contract.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { DomainError } from '../../common/domain-error.js';
import { ReservationEntity } from '../reservations/infra/reservation.entity.js';
import { toSnapshot as toReservation } from '../reservations/infra/typeorm-reservation.repository.js';
import { Repository } from 'typeorm';
import { RoomEntity } from '../rooms/infra/room.entity.js';
import { UserEntity } from '../users/infra/user.entity.js';
import { ListAdminReservationsQueryDto } from './dto/list-admin-reservations-query.dto.js';
import { StatisticsQueryDto } from './dto/statistics-query.dto.js';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(ReservationEntity)
    private readonly reservations: Repository<ReservationEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(RoomEntity)
    private readonly rooms: Repository<RoomEntity>,
    private readonly authorization: AuthorizationService,
  ) {}

  async listReservations(
    requesterId: string,
    query: ListAdminReservationsQueryDto,
  ): Promise<PaginatedReservations> {
    await this.authorization.assertAdmin(requesterId);
    const qb = this.reservations
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .addOrderBy('r.id')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.status)
      qb.andWhere('r.status = :status', { status: query.status });
    if (query.roomId)
      qb.andWhere('r.roomId = :roomId', { roomId: query.roomId });
    if (query.userId)
      qb.andWhere('r.userId = :userId', { userId: query.userId });
    const [items, total] = await qb.getManyAndCount();
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map(toReservation),
    };
  }

  async statistics(
    requesterId: string,
    query: StatisticsQueryDto,
  ): Promise<Statistics> {
    await this.authorization.assertAdmin(requesterId);
    if (query.from && query.to && query.from > query.to) {
      throw new DomainError(
        'invalid',
        'INVALID_DATE_RANGE',
        'La date de début doit précéder la date de fin.',
      );
    }
    const base = this.reservations.createQueryBuilder('r');
    if (query.from) base.andWhere('r.startTime >= :from', { from: query.from });
    if (query.to)
      base.andWhere("r.startTime < (CAST(:to AS date) + INTERVAL '1 day')", {
        to: query.to,
      });
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
      totalUsers: await this.users.count(),
      totalRooms: await this.rooms.count(),
      totalReservations,
      confirmedReservations,
      cancelledReservations,
      totalRevenue: Number(revenue?.total ?? 0),
    };
  }
}
