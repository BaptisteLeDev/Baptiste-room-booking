import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    fileParallelism: false,
    env: { DB_NAME: 'resa_db_test', JWT_SECRET: 'test-secret' },
    globalSetup: ['./test/global-setup.ts'],
  },
});
