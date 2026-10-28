import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimal } from '../../../database/decimal.transformer.js';

// Read-only view of `reservations`; schema owned by reservations/infra.
@Entity('reservations', { synchronize: false })
export class AdminReservationRow {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @Column({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'varchar', length: 10 })
  status!: string;

  @Column({ type: 'int', nullable: true, name: 'number_of_participants' })
  numberOfParticipants!: number | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({ type: 'numeric', name: 'total_amount', transformer: decimal })
  totalAmount!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
