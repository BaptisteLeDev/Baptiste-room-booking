import { afterEach, describe, expect, it, vi } from 'vitest';
import { envOrDevFallback, requiredEnv } from './env.js';

afterEach(() => vi.unstubAllEnvs());

describe('requiredEnv', () => {
  it('returns the value', () => {
    vi.stubEnv('DB_USER_TEST', 'resa_user');
    expect(requiredEnv('DB_USER_TEST')).toBe('resa_user');
  });

  it('throws when missing or empty', () => {
    vi.stubEnv('DB_USER_TEST', '');
    expect(() => requiredEnv('DB_USER_TEST')).toThrow(
      'DB_USER_TEST is required',
    );
  });
});

describe('envOrDevFallback', () => {
  it('uses the variable when set', () => {
    vi.stubEnv('OBSERVE_APP_KEY_TEST', 'real');
    expect(envOrDevFallback('OBSERVE_APP_KEY_TEST', 'dev')).toBe('real');
  });

  it('falls back outside production', () => {
    vi.stubEnv('OBSERVE_APP_KEY_TEST', '');
    vi.stubEnv('NODE_ENV', 'development');
    expect(envOrDevFallback('OBSERVE_APP_KEY_TEST', 'dev')).toBe('dev');
  });

  it('throws in production when unset', () => {
    vi.stubEnv('OBSERVE_APP_KEY_TEST', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => envOrDevFallback('OBSERVE_APP_KEY_TEST', 'dev')).toThrow(
      'OBSERVE_APP_KEY_TEST is required in production',
    );
  });
});
