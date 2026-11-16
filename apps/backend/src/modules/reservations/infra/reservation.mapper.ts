import {
  Reservation,
  type ReservationSnapshot,
} from '../domain/reservation.js';
import { ReservationEntity } from './reservation.entity.js';

export const toReservation = (e: ReservationEntity): Reservation =>
  Reservation.restore({
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
  });

export const toEntity = (s: ReservationSnapshot): ReservationEntity =>
  Object.assign(new ReservationEntity(), {
    id: s.id,
    roomId: s.roomId,
    userId: s.userId,
    startTime: new Date(s.startAt),
    endTime: new Date(s.endAt),
    status: s.status,
    numberOfParticipants: s.numberOfParticipants ?? null,
    comment: s.comment ?? null,
    totalAmount: s.totalAmount,
    currency: s.currency,
    createdAt: new Date(s.createdAt),
  });
