import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import type { RevokedTokenStore } from '../domain/revoked-token-store.js';
import { RevokedTokenEntity } from './revoked-token.entity.js';

@Injectable()
export class TypeOrmRevokedTokenStore implements RevokedTokenStore {
  constructor(
    @InjectRepository(RevokedTokenEntity)
    private readonly rows: Repository<RevokedTokenEntity>,
  ) {}

  async revoke(jti: string, expSeconds: number): Promise<void> {
    // Lazy purge: verify already rejects a token past its exp.
    await this.rows.delete({ expiresAt: LessThan(new Date()) });
    await this.rows.upsert({ jti, expiresAt: new Date(expSeconds * 1000) }, [
      'jti',
    ]);
  }

  isRevoked(jti: string): Promise<boolean> {
    return this.rows.existsBy({ jti });
  }
}
