import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type {
  PayableReservation,
  ReservationCatalog,
} from '../domain/ports/reservation-catalog.port.js';

@Injectable()
export class TypeOrmReservationCatalog implements ReservationCatalog {
  constructor(private readonly dataSource: DataSource) {}

  async findPayableReservation(id: string): Promise<PayableReservation | null> {
    const [row] = await this.dataSource.query<
      { id: string; userId: string; amount: string; currency: string }[]
    >(
      `SELECT id, user_id AS "userId", total_amount AS amount, currency
       FROM reservations WHERE id = $1`,
      [id],
    );
    return row ? { ...row, amount: Number(row.amount) } : null;
  }
}
