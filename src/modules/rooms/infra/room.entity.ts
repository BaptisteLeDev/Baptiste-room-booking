import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { UserEntity } from '../../users/infra/user.entity.js';
import { decimal } from '../../../database/decimal.transformer.js';
import { AvailabilityEntity } from './availability.entity.js';

@Entity('rooms')
@Check('"capacity" >= 1')
@Check('"price_per_hour" >= 0')
@Check(`"status" IN ('ACTIVE','INACTIVE')`)
export class RoomEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner!: Relation<UserEntity>;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'varchar', length: 255 })
  location!: string;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  equipment!: string[];

  @Column({
    type: 'numeric',
    precision: 10,
    scale: 2,
    name: 'price_per_hour',
    transformer: decimal,
  })
  pricePerHour!: number;

  @Column({ type: 'varchar', length: 10, default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true, name: 'image_url' })
  imageUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @OneToMany(() => AvailabilityEntity, (a) => a.room)
  availabilities!: AvailabilityEntity[];
}
