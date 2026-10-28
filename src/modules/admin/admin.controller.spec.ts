import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

describe('AdminController', () => {
  it('is defined', async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: {} }],
    }).compile();
    expect(module.get(AdminController)).toBeDefined();
  });
});
