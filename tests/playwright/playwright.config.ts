import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Under CI, several workers logging in against the same single WordPress
  // container at once has occasionally been slow enough to blow the default
  // 30s per-test timeout during login (page.waitForURL in fixtures/base.ts)
  // - not a session-expiry issue, just contention. 1 worker trades away some
  // wall-clock time for reliability; the longer timeout gives a login that's
  // merely slow (rather than genuinely broken) room to complete either way.
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60000 : undefined,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
