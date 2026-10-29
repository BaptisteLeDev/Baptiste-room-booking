import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../../common/database/paginate.js';
import { hasPgCode, PgCode } from '../../../common/database/pg-error.js';
import { emailUsed, type User } from '../domain/entities/user.entity.js';
import type {
  IUserRepository,
  UserListFilter,
  UserPage,
} from '../domain/repositories/user.repository.interface.js';
import { UserEntity } from './user.entity.js';
import { toDomain, toEntity } from './user.mapper.js';

@Injectable()
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly rows: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.rows.findOneBy({ id });
    return row ? toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.rows.findOneBy({ email });
    return row ? toDomain(row) : null;
  }

  existsByEmail(email: string): Promise<boolean> {
    return this.rows.existsBy({ email });
  }

  async save(user: User): Promise<User> {
    try {
      return toDomain(await this.rows.save(toEntity(user.toState())));
    } catch (e) {
      if (hasPgCode(e, PgCode.UNIQUE_VIOLATION)) throw emailUsed();
      throw e;
    }
  }

  // Only these columns: a full-row save would undo a concurrent role change.
  async savePassword(user: User): Promise<void> {
    await this.rows.update(user.id, {
      passwordHash: user.passwordHash,
      passwordChangedAt: user.passwordChangedAt ?? null,
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.rows.delete(id);
    return !!result.affected;
  }

  async findPage(q: UserListFilter): Promise<UserPage> {
    const qb = this.rows
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id');
    if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    const { items, total } = await paginate(qb, q.page, q.pageSize);
    return {
      page: q.page,
      pageSize: q.pageSize,
      total,
      items: items.map(toDomain),
    };
  }
}
