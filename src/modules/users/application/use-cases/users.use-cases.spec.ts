import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DomainError } from '../../../../common/domain-error.js';
import { User } from '../../domain/entities/user.entity.js';
import type { IUserRepository } from '../../domain/repositories/user.repository.interface.js';
import { DeleteUserUseCase } from './delete-user.use-case.js';
import { GetUserUseCase } from './get-user.use-case.js';
import { ListUsersUseCase } from './list-users.use-case.js';
import { UpdateUserUseCase } from './update-user.use-case.js';
import { rejection } from '../../../../../test/helpers/rejection.js';

const ada = () =>
  User.restore({
    id: 'u1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    passwordHash: 'hash',
    tokenVersion: 0,
    role: 'CLIENT',
    createdAt: '2026-01-01T00:00:00.000Z',
  });

const repo = (users: User[], taken: string[] = []): IUserRepository => ({
  findById: async (id) => users.find((u) => u.id === id) ?? null,
  findByEmail: async (email) => users.find((u) => u.email === email) ?? null,
  existsByEmail: async (email) => taken.includes(email),
  save: async (u) => u,
  updateProfile: async () => {},
  replacePasswordHash: async () => {},
  delete: async (id) => users.some((u) => u.id === id),
  findPage: async (f) => ({
    page: f.page,
    pageSize: f.pageSize,
    total: users.length,
    items: users,
  }),
});

const authz = (admin: boolean) =>
  ({
    assertAdmin: vi.fn(async () => {
      if (!admin) throw new ForbiddenException();
    }),
    requireSelfOrAdmin: vi.fn(async () => admin),
  }) as never;

describe('users use cases', () => {
  it('get returns a snapshot without passwordHash', async () => {
    const result = await new GetUserUseCase(
      repo([ada()]),
      authz(false),
    ).execute('u1', 'u1');
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.email).toBe('ada@example.com');
  });

  it('get rejects NOT_FOUND for unknown id', async () => {
    const error = await rejection(
      new GetUserUseCase(repo([]), authz(true)).execute('a', 'x'),
    );
    expect(error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('list requires admin and maps snapshots', async () => {
    const forbidden = await rejection(
      new ListUsersUseCase(repo([ada()]), authz(false)).execute('u1', {
        page: 1,
        pageSize: 20,
      }),
    );
    expect(forbidden).toBeInstanceOf(ForbiddenException);
    const page = await new ListUsersUseCase(repo([ada()]), authz(true)).execute(
      'admin',
      { page: 1, pageSize: 20 },
    );
    expect(page).toMatchObject({ total: 1, items: [{ id: 'u1' }] });
  });

  it('update forbids role change for non-admin', async () => {
    const error = await rejection(
      new UpdateUserUseCase(repo([ada()]), authz(false)).execute('u1', 'u1', {
        role: 'ADMINISTRATEUR',
      }),
    );
    expect(error).toBeInstanceOf(ForbiddenException);
  });

  it('update lets admin change role and normalizes email', async () => {
    const result = await new UpdateUserUseCase(
      repo([ada()]),
      authz(true),
    ).execute('admin', 'u1', { role: 'GESTIONNAIRE', email: ' New@X.io ' });
    expect(result).toMatchObject({ role: 'GESTIONNAIRE', email: 'new@x.io' });
  });

  it('update persists through updateProfile, never save (no lost password update)', async () => {
    const updateProfile = vi.fn(async () => {});
    const save = vi.fn(async (u: User) => u);
    await new UpdateUserUseCase(
      { ...repo([ada()]), updateProfile, save },
      authz(true),
    ).execute('admin', 'u1', { firstName: 'Grace' });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('update rejects an email already used', async () => {
    const error = await rejection(
      new UpdateUserUseCase(repo([ada()], ['b@x.io']), authz(false)).execute(
        'u1',
        'u1',
        { email: 'B@x.io' },
      ),
    );
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toMatchObject({ code: 'EMAIL_ALREADY_USED' });
  });

  it('update accepts unchanged own email', async () => {
    const result = await new UpdateUserUseCase(
      repo([ada()], ['ada@example.com']),
      authz(false),
    ).execute('u1', 'u1', { email: 'ADA@example.com' });
    expect(result.email).toBe('ada@example.com');
  });

  it('delete requires admin and rejects unknown id', async () => {
    const forbidden = await rejection(
      new DeleteUserUseCase(repo([ada()]), authz(false)).execute('u1', 'u1'),
    );
    expect(forbidden).toBeInstanceOf(ForbiddenException);
    const missing = await rejection(
      new DeleteUserUseCase(repo([]), authz(true)).execute('admin', 'x'),
    );
    expect(missing).toMatchObject({ code: 'NOT_FOUND' });
  });
});
