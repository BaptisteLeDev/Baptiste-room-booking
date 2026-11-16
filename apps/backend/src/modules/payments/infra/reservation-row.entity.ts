import { Entity, PrimaryColumn } from 'typeorm';

// FK target only; schema owned by reservations/infra.
@Entity('reservations', { synchronize: false })
export class ReservationRow {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;
}
