import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { DeleteUserUseCase } from './application/use-cases/delete-user.use-case.js';
import { GetUserUseCase } from './application/use-cases/get-user.use-case.js';
import { ListUsersUseCase } from './application/use-cases/list-users.use-case.js';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case.js';
import { UsersController } from './users.controller.js';

describe('UsersController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        ListUsersUseCase,
        GetUserUseCase,
        UpdateUserUseCase,
        DeleteUserUseCase,
      ].map((useCase) => ({ provide: useCase, useValue: {} })),
    }).compile();

    expect(module.get(UsersController)).toBeDefined();
  });
});
