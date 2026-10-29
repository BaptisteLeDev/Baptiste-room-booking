import {
  Check,
  Column,
  Entity,
  Exclusion,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { decimal } from '../../../database/decimal.transformer.js';
import { RoomRow } from './room-row.entity.js';
import { UserRow } from './user-row.entity.js';

@Entity('reservations')
@Check('"end_time" > "start_time"')
@Check(
  `"status" IN ('PENDING_PAYMENT','CONFIRMED','REFUSED','CANCELLED','COMPLETED')`,
)
@Exclusion(
  'no_overlap_active',
  `USING gist ("room_id" WITH =, tstzrange("start_time", "end_time") WITH &&) WHERE ("status" IN ('PENDING_PAYMENT', 'CONFIRMED'))`,
)
export class ReservationEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @ManyToOne(() => UserRow)
  @JoinColumn({ name: 'user_id' })
  user!: Relation<UserRow>;

  @Column({ type: 'uuid', name: 'user_id' })
  userId!: string;

  @ManyToOne(() => RoomRow, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'room_id' })
  room!: Relation<RoomRow>;

  @Column({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'varchar', length: 20 })
  status!: string;

  @Column({ type: 'int', nullable: true, name: 'number_of_participants' })
  numberOfParticipants!: number | null;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'total_amount',
    transformer: decimal,
  })
  totalAmount!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
