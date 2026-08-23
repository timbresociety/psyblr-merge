import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'on-first-retry' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: true },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], browserName: 'chromium', viewport: { width: 1280, height: 720 } } },
    { name: 'mobile-landscape', use: { ...devices['iPhone 14'], browserName: 'chromium', viewport: { width: 844, height: 390 }, isMobile: true } },
  ],
});
