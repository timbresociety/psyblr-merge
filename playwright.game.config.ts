import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'game-v2.spec.ts',
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'mobile-landscape',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        viewport: { width: 844, height: 390 },
        isMobile: true,
      },
    },
  ],
});
