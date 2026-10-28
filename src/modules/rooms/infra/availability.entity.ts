import {
  Check,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { RoomEntity } from './room.entity.js';

@Entity('availabilities')
@Check('"end_time" > "start_time"')
export class AvailabilityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => RoomEntity, (r) => r.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room!: Relation<RoomEntity>;

  @Column({ type: 'uuid', name: 'room_id' })
  roomId!: string;

  @Column({ type: 'timestamptz', name: 'start_time' })
  startTime!: Date;

  @Column({ type: 'timestamptz', name: 'end_time' })
  endTime!: Date;

  @Column({ type: 'boolean', default: true })
  available!: boolean;
}
