import { defineConfig, devices } from '@playwright/test';

const browserName = (process.env.PW_BROWSER ?? 'chromium') as 'chromium'|'firefox'|'webkit';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    browserName,
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'demo',
      use: { baseURL: 'http://localhost:5173' },
      webServer: {
        command: 'npm run build:demo && npm run preview:demo',
        url: 'http://localhost:5173',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
    },
    {
      name: 'trial',
      use: { baseURL: 'http://localhost:5174' },
      webServer: {
        command: 'npm run build:trial && npm run preview:trial',
        url: 'http://localhost:5174',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
    },
    {
      name: 'prod',
      use: { baseURL: 'http://localhost:5175' },
      webServer: {
        command: 'npm run build:prod && npm run preview:prod',
        url: 'http://localhost:5175',
        timeout: 120_000,
        reuseExistingServer: !process.env.CI,
      },
    },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
