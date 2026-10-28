import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';

const row = (overrides = {}) =>
  Object.assign(
    {
      id: '00000000-0000-4000-8000-000000000001',
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      role: 'CLIENT',
      passwordHash: 'secret',
      createdAt: new Date('2026-01-01T00:00:00Z'),
    },
    overrides,
  );

describe('UsersService', () => {
  let users: {
    findOneBy: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let authorization: {
    assertAdmin: ReturnType<typeof vi.fn>;
    requireSelfOrAdmin: ReturnType<typeof vi.fn>;
  };
  let service: UsersService;

  beforeEach(() => {
    users = {
      findOneBy: vi.fn().mockResolvedValue(row()),
      save: vi.fn().mockImplementation(async (value: object) => value),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
    };
    authorization = {
      assertAdmin: vi.fn(),
      requireSelfOrAdmin: vi.fn().mockResolvedValue(false),
    };
    service = new UsersService(users as never, authorization as never);
  });

  it('maps a user without exposing passwordHash', async () => {
    const result = await service.get(row().id, row().id);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('ada@example.com');
  });

  it('requires admin authorization before deleting', async () => {
    await service.remove('admin-id', row().id);
    expect(authorization.assertAdmin).toHaveBeenCalledWith('admin-id');
  });
});
