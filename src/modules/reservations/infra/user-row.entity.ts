import { Entity, PrimaryColumn } from 'typeorm';

// FK target only; schema owned by users/infra.
@Entity('users', { synchronize: false })
export class UserRow {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;
}
