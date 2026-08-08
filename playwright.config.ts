import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testIgnore: ['**/phenotype-library/**'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Use 'list' reporter to avoid HTML server hanging
  // HTML report still generated but not served/opened
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
    // Visual regression testing config (Task T141)
    toMatchSnapshot: {
      threshold: 0.3, // 30% difference allowed (Material Design will differ from reference)
      maxDiffPixels: 1000,
    },
  },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 30000, // 30 seconds for page loads
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Firefox and WebKit disabled for faster development iteration
    // Re-enable for full cross-browser testing before release
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  webServer: {
    // Use --mode test to load .env.test with auth disabled for E2E tests
    command: 'npm run dev -- --mode test',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
})
