import { Inject, Injectable } from '@nestjs/common';
import { notFound } from '../../../../common/not-found.js';
import { AuthorizationService } from '../../../auth/authorization.service.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface.js';

@Injectable()
export class DeleteUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(requesterId: string, id: string): Promise<void> {
    await this.authorization.assertAdmin(requesterId);
    if (!(await this.users.delete(id))) throw notFound();
  }
}
