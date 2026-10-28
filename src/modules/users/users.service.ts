import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  PaginatedUsers,
  User,
  UserUpdateRequest,
} from '../../contract.js';
import { notFound } from '../../common/not-found.js';
import { AuthorizationService } from '../auth/authorization.service.js';
import { Repository } from 'typeorm';
import { UserEntity } from './infra/user.entity.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { emailUsed, normalizeEmail, toUser } from './user.mapper.js';
import { hasPgCode } from '../../common/database/pg-error.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly authorization: AuthorizationService,
  ) {}

  async list(
    requesterId: string,
    query: ListUsersQueryDto,
  ): Promise<PaginatedUsers> {
    await this.authorization.assertAdmin(requesterId);
    const qb = this.users
      .createQueryBuilder('u')
      .orderBy('u.createdAt', 'DESC')
      .addOrderBy('u.id')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);
    if (query.role) qb.andWhere('u.role = :role', { role: query.role });
    const [items, total] = await qb.getManyAndCount();
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      items: items.map(toUser),
    };
  }

  async get(requesterId: string, id: string): Promise<User> {
    await this.authorization.requireSelfOrAdmin(requesterId, id);
    return toUser(await this.load(id));
  }

  async update(
    requesterId: string,
    id: string,
    changes: UserUpdateRequest,
  ): Promise<User> {
    const isAdmin = await this.authorization.requireSelfOrAdmin(
      requesterId,
      id,
    );
    if (changes.role !== undefined && !isAdmin) {
      throw new ForbiddenException();
    }
    const user = await this.load(id);
    Object.assign(
      user,
      Object.fromEntries(
        Object.entries(changes).filter(
          ([key, value]) => value !== undefined && (isAdmin || key !== 'role'),
        ),
      ),
    );
    if (user.email) user.email = normalizeEmail(user.email);
    try {
      return toUser(await this.users.save(user));
    } catch (e) {
      if (hasPgCode(e, UNIQUE_VIOLATION)) throw emailUsed();
      throw e;
    }
  }

  async remove(requesterId: string, id: string): Promise<void> {
    await this.authorization.assertAdmin(requesterId);
    const result = await this.users.delete(id);
    if (!result.affected) throw notFound();
  }

  private async load(id: string): Promise<UserEntity> {
    const user = await this.users.findOneBy({ id });
    if (!user) throw notFound();
    return user;
  }
}
