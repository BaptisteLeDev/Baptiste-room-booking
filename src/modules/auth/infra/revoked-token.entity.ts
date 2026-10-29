import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('revoked_tokens')
export class RevokedTokenEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  jti!: string;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt!: Date;
}
