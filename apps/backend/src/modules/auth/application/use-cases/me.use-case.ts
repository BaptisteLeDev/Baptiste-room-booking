import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { User as UserDto } from '../../../../contract.js';
import {
  type IUserRepository,
  USER_REPOSITORY,
} from '../../../users/domain/repositories/user.repository.interface.js';

@Injectable()
export class MeUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
  ) {}

  async execute(userId: string): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user.toSnapshot();
  }
}
