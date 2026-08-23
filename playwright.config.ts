import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The suite is fullyParallel and every spec mocks WebAPI per page, so workers
  // cost CPU, not isolation. Four only holds up when the built app is being
  // served (see webServer): against the dev server, four browsers queue behind
  // its single transform pipeline and the slower routes time out. The
  // phenotype workflow passes its own --workers, which overrides this.
  workers: process.env.CI ? 4 : undefined,
  // Use 'list' reporter to avoid HTML server hanging
  // HTML report still generated but not served/opened
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  timeout: 60000, // 60 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
    // Visual regression testing config (Task T141)
    //
    // page.toHaveScreenshot() reads its defaults from expect.toHaveScreenshot,
    // not expect.toMatchSnapshot (that key only applies to the generic
    // expect(value).toMatchSnapshot() buffer/string matcher — a different API
    // that nothing in this suite calls). With the tolerance parked under the
    // wrong key, every toHaveScreenshot() call that doesn't pass its own
    // per-call options (dark-mode-visual.spec.ts's dark-mode screenshots) fell
    // back to Playwright's built-in default of zero pixel tolerance instead of
    // the loose comparison intended here — enough anti-aliasing/chart-render
    // jitter to flake routes that never touched the mock change in this diff
    // (e.g. landing/cohorts/pathways failing at ~0.01% pixel diff).
    toHaveScreenshot: {
      threshold: 0.3, // 30% per-pixel colour difference allowed (Material Design will differ from reference)
      maxDiffPixels: 1000,
    },
  },

  use: {
    baseURL: 'http://localhost:5173',
    // CI runs in a UTC container. Time-axis charts tick on local midnight, so
    // without this the data-sources dashboard renders different axis labels for
    // anyone outside UTC and their screenshots never match the baselines.
    timezoneId: 'UTC',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10000, // 10 seconds for actions
    navigationTimeout: 30000, // 30 seconds for page loads
  },

  projects: [
    {
      name: 'chromium',
      // The phenotype library is its own project below: 1104 fidelity cases
      // that the regular suite has no business running on every push.
      testIgnore: ['**/phenotype-library/**'],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'phenotype',
      testDir: './tests/e2e/phenotype-library',
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
    // Serving the built app takes vite's on-demand transform off the hot path,
    // which is what lets the e2e job run four workers without its slower routes
    // timing out. Opt-in rather than keyed to CI: the phenotype workflow shares
    // this config, builds nothing, and would find no dist/ to serve.
    // Use --mode test to load .env.test with auth disabled for E2E tests.
    command: process.env.E2E_SERVE_BUILD
      ? 'npm run preview -- --port 5173 --strictPort'
      : 'npm run dev -- --mode test',
    url: 'http://localhost:5173',
    // Attaching to a dev server someone left running on another branch silently
    // tests that branch's code — never do it in CI or when recording baselines.
    reuseExistingServer: !process.env.CI,
  },
})
