import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { decimal } from '../../../database/decimal.transformer.js';

@Entity('payments')
@Check(`"status" IN ('PENDING','PAID','FAILED','REFUNDED')`)
export class PaymentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'reservation_id' })
  reservationId!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'external_transaction_id',
  })
  externalTransactionId!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: decimal })
  amount!: number;

  @Column({ type: 'char', length: 3 })
  currency!: string;

  @Column({ type: 'varchar', length: 10 })
  status!: string;

  @Column({
    type: 'varchar',
    length: 2048,
    nullable: true,
    name: 'payment_url',
  })
  paymentUrl!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
