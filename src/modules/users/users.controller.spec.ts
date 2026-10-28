import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: {} }],
    }).compile();

    expect(module.get(UsersController)).toBeDefined();
  });
});
