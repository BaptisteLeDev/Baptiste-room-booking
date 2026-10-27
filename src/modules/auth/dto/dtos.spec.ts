import 'reflect-metadata';
import {
  check,
  LONG_EMAIL,
  props,
} from '../../../common/validation/dto-test-helpers.js';
import type {
  ChangePasswordRequest,
  LoginRequest,
  RegisterRequest,
} from '../../../contract.js';
import { ChangePasswordDto } from './change-password.dto.js';
import { LoginDto } from './login.dto.js';
import { RegisterDto } from './register.dto.js';

describe('RegisterDto', () => {
  const valid: RegisterRequest = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'longenough',
  };

  it('accepts a valid payload', async () => {
    expect(await check(RegisterDto, valid)).toHaveLength(0);
  });

  it('accepts boundary lengths (100 name chars, 8 password chars)', async () => {
    const errors = await check(RegisterDto, {
      ...valid,
      firstName: 'a'.repeat(100),
      lastName: 'b'.repeat(100),
      password: '12345678',
    });
    expect(errors).toHaveLength(0);
  });

  it.each(['firstName', 'lastName', 'email', 'password'])(
    'rejects missing %s',
    async (field) => {
      const errors = await check(RegisterDto, { ...valid, [field]: undefined });
      expect(props(errors)).toContain(field);
    },
  );

  it('rejects firstName longer than 100', async () => {
    const errors = await check(RegisterDto, {
      ...valid,
      firstName: 'a'.repeat(101),
    });
    expect(props(errors)).toContain('firstName');
  });

  it('rejects lastName longer than 100', async () => {
    const errors = await check(RegisterDto, {
      ...valid,
      lastName: 'a'.repeat(101),
    });
    expect(props(errors)).toContain('lastName');
  });

  it('rejects malformed email', async () => {
    const errors = await check(RegisterDto, {
      ...valid,
      email: 'not-an-email',
    });
    expect(props(errors)).toContain('email');
  });

  it('rejects email longer than 254', async () => {
    const errors = await check(RegisterDto, { ...valid, email: LONG_EMAIL });
    expect(props(errors)).toContain('email');
  });

  it('rejects password shorter than 8', async () => {
    const errors = await check(RegisterDto, { ...valid, password: '1234567' });
    expect(props(errors)).toContain('password');
  });
});

describe('LoginDto', () => {
  const valid: LoginRequest = { email: 'ada@example.com', password: 'secret' };

  it('accepts a valid payload', async () => {
    expect(await check(LoginDto, valid)).toHaveLength(0);
  });

  it.each(['email', 'password'])('rejects missing %s', async (field) => {
    const errors = await check(LoginDto, { ...valid, [field]: undefined });
    expect(props(errors)).toContain(field);
  });

  it('rejects malformed email', async () => {
    const errors = await check(LoginDto, { ...valid, email: 'nope' });
    expect(props(errors)).toContain('email');
  });
});

describe('ChangePasswordDto', () => {
  const valid: ChangePasswordRequest = {
    currentPassword: 'oldsecret',
    newPassword: 'newsecret',
  };

  it('accepts a valid payload', async () => {
    expect(await check(ChangePasswordDto, valid)).toHaveLength(0);
  });

  it.each(['currentPassword', 'newPassword'])(
    'rejects missing %s',
    async (field) => {
      const errors = await check(ChangePasswordDto, {
        ...valid,
        [field]: undefined,
      });
      expect(props(errors)).toContain(field);
    },
  );

  it('rejects newPassword shorter than 8', async () => {
    const errors = await check(ChangePasswordDto, {
      ...valid,
      newPassword: '1234567',
    });
    expect(props(errors)).toContain('newPassword');
  });
});
