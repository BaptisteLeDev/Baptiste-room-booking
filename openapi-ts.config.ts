import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: '../core/openapi.yml',
  output: 'src/contract/generated',
  plugins: ['@hey-api/typescript'],
});
