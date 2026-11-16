import { Inject, Injectable } from '@nestjs/common';
import type { PaginatedUsers } from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
  type UserListFilter,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(
    requesterId: string,
    filter: UserListFilter,
  ): Promise<PaginatedUsers> {
    await this.authorization.assertAdmin(requesterId);
    const page = await this.users.findPage(filter);
    return {
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      items: page.items.map((user) => user.toSnapshot()),
    };
  }
}
