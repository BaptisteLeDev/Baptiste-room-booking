import { Inject, Injectable } from '@nestjs/common';
import type { User as UserDto } from '../../../../contract.js';
import { AuthorizationService } from '../../../auth/application/authorization.service.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../domain/repositories/user.repository.interface.js';
import { orNotFound } from '../../../../common/not-found.js';

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    private readonly authorization: AuthorizationService,
  ) {}

  async execute(requesterId: string, id: string): Promise<UserDto> {
    await this.authorization.requireSelfOrAdmin(requesterId, id);
    return orNotFound(await this.users.findById(id)).toSnapshot();
  }
}
