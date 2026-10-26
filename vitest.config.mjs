import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Integration tests need a MongoDB replica set; point TEST_DATABASE_URL at a
// disposable database (see tests/README.md). Without it they are skipped.
const testDb = process.env.TEST_DATABASE_URL || '';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    globalSetup: ['tests/helpers/globalSetup.js'],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDb || 'mongodb://127.0.0.1:1/unused',
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      AI_TIMEZONE: 'UTC',
      AI_PROVIDER: 'scripted',
      ANTHROPIC_API_KEY: '',
    },
  },
});
