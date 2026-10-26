import { execSync } from 'node:child_process';

/** Sync the Prisma schema into the disposable test database, if configured. */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    console.warn('\n[tests] TEST_DATABASE_URL not set — database integration tests will be skipped.\n');
    return;
  }
  if (!/test/i.test(url)) {
    throw new Error('TEST_DATABASE_URL must name a test database (the URL must contain "test"); refusing to wipe it.');
  }
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'ignore',
    env: { ...process.env, DATABASE_URL: url },
  });
}
