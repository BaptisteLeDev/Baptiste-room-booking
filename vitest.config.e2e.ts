import { defineConfig } from 'vitest/config';

const env = {
  DB_USER: 'resa_user',
  DB_PASSWORD: 'resa_password',
  DB_NAME: 'resa_db_test',
  JWT_SECRET: 'test-secret-that-is-at-least-32-chars',
};
// globalSetup imports the data source before test.env applies.
Object.assign(process.env, env);

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env,
    globalSetup: ['./test/global-setup.ts'],
  },
});
