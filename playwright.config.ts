import { defineConfig, devices } from '@playwright/test';

const browserName = (process.env.PW_BROWSER ?? 'chromium') as 'chromium'|'firefox'|'webkit';

export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  fullyParallel: true,
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    browserName,
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      args: ['--font-render-hinting=none'],
    },
  },
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
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
