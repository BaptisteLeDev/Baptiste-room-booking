import { Column, Entity, PrimaryColumn } from 'typeorm';
import { decimal } from '../../../database/decimal.transformer.js';

// Read-only view of `rooms`; schema owned by rooms/infra.
@Entity('rooms', { synchronize: false })
export class RoomRow {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId!: string;

  @Column({ type: 'int' })
  capacity!: number;

  @Column({ type: 'numeric', name: 'price_per_hour', transformer: decimal })
  pricePerHour!: number;

  @Column({ type: 'varchar', length: 10 })
  status!: string;
}
