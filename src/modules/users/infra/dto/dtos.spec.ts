import 'reflect-metadata';
import {
  check,
  LONG_EMAIL,
  props,
} from '../../../../common/validation/dto-test-helpers.js';
import type { UserUpdateRequest } from '../../../../contract.js';
import { UpdateUserDto } from './update-user.dto.js';

describe('UpdateUserDto', () => {
  const partial: UserUpdateRequest = { firstName: 'Ada' };
  const full: UserUpdateRequest = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    role: 'GESTIONNAIRE',
  };

  it('accepts a partial payload', async () => {
    expect(await check(UpdateUserDto, partial)).toHaveLength(0);
  });

  it('accepts a full payload', async () => {
    expect(await check(UpdateUserDto, full)).toHaveLength(0);
  });

  it('rejects an empty object (minProperties 1)', async () => {
    const errors = await check(UpdateUserDto, {});
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects firstName longer than 100', async () => {
    const errors = await check(UpdateUserDto, { firstName: 'a'.repeat(101) });
    expect(props(errors)).toContain('firstName');
  });

  it('rejects lastName longer than 100', async () => {
    const errors = await check(UpdateUserDto, { lastName: 'a'.repeat(101) });
    expect(props(errors)).toContain('lastName');
  });

  it('rejects malformed email', async () => {
    const errors = await check(UpdateUserDto, { email: 'not-an-email' });
    expect(props(errors)).toContain('email');
  });

  it('rejects email longer than 254', async () => {
    const errors = await check(UpdateUserDto, { email: LONG_EMAIL });
    expect(props(errors)).toContain('email');
  });

  it('rejects role outside UserRole enum', async () => {
    const errors = await check(UpdateUserDto, { role: 'ROOT' });
    expect(props(errors)).toContain('role');
  });
  it.each(['firstName', 'lastName', 'email', 'role'])(
    'rejects null %s',
    async (field) => {
      const errors = await check(UpdateUserDto, { [field]: null });
      expect(props(errors)).toContain(field);
    },
  );
});
