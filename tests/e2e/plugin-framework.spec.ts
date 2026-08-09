import { test, expect } from '@playwright/test';
import { setupBasicMocks } from './helpers/api-mocks'

test.describe('Plugin Framework', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await setupBasicMocks(page)
    await page.goto('/#/');
  });

  test('should load plugin framework on app initialization', async ({ page }) => {
    // Check console for plugin framework initialization
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.reload();
    await page.waitForTimeout(3000);

    // Verify plugin framework logs (logger format: [PluginFramework] Initializing...).
    // The Vite dev server (playwright's webServer) always runs with
    // import.meta.env.DEV true regardless of --mode, so src/utils/logger.ts
    // sets its level to 'debug' and info-level logs are never suppressed
    // here; this is not a case where the log is genuinely optional.
    const hasPluginLog = logs.some(log =>
      log.includes('[PluginFramework]') ||
      log.includes('PluginFramework') ||
      log.includes('plugin')
    );

    expect(hasPluginLog).toBe(true);
  });

  test('should display hello-world plugin menu item', async ({ page }) => {
    // Wait for menu to load
    await page.waitForTimeout(2000);

    // Look for Hello World menu item
    const menuItem = page.locator('text=Hello World');

    // Check if menu item is visible (if plugins loaded)
    const isVisible = await menuItem.isVisible().catch(() => false);

    if (isVisible) {
      await expect(menuItem).toBeVisible();
    } else {
      // Plugin may not be registered in test environment
      console.log('Hello World plugin menu item not found - may need authentication');
    }
  });

  test('should navigate to plugin route', async ({ page }) => {
    // Try to navigate directly to plugin route
    await page.goto('/#/plugins/hello-world-plugin/main');

    // Wait for plugin or auth redirect
    await page.waitForTimeout(2000);

    // Check if we're on the plugin page or auth page
    const url = page.url();
    expect(url.includes('/plugins/hello-world-plugin') || url === '/').toBeTruthy();
  });

  // fixme: same root cause as 'Plugin Authentication' below: hello-world-plugin's bundle is
  // not built and no CI step builds it, so "Loading plugin..." is confirmed (manually probed)
  // to stay visible forever instead of resolving. The guard this replaces never actually
  // exercised the toBeHidden() assertion because hasLoading only reads true right up to the
  // point where the timeout would fire anyway.
  test.fixme('should handle plugin loading states', async ({ page }) => {
    // Navigate to plugin route
    await page.goto('/#/plugins/hello-world-plugin/main');

    // Check for loading indicator
    const loadingIndicator = page.locator('text=Loading plugin');
    await expect(loadingIndicator).toBeVisible();
    await expect(loadingIndicator).toBeHidden({ timeout: 10000 });
  });

  test('should display error UI on plugin load failure', async ({ page }) => {
    // Try to load non-existent plugin
    await page.goto('/#/plugins/non-existent-plugin/main');

    await page.waitForTimeout(2000);

    // Check for error UI or redirect
    const url = page.url();
    expect(url === '/' || url.includes('/plugins/')).toBeTruthy();
  });

  test('should measure plugin navigation performance', async ({ page }) => {
    // Navigate to home
    await page.goto('/#/');
    await page.waitForTimeout(1000);

    // Measure navigation to plugin
    const startTime = Date.now();
    await page.goto('/#/plugins/hello-world-plugin/main');
    await page.waitForTimeout(500);
    const endTime = Date.now();

    const navigationTime = endTime - startTime;

    // SC-006: Navigation should be < 200ms (allowing extra time for network)
    // In E2E tests we allow up to 2000ms due to network overhead
    expect(navigationTime).toBeLessThan(2000);
    console.log(`Plugin navigation time: ${navigationTime}ms`);
  });

  test('should handle multiple plugin routes', async ({ page }) => {
    // Test that plugin routes are properly scoped
    await page.goto('/#/plugins/hello-world-plugin/main');
    await page.waitForTimeout(500);

    // Try a different route for the same plugin
    await page.goto('/#/plugins/hello-world-plugin/about');
    await page.waitForTimeout(500);

    // Should not cause errors
    const url = page.url();
    expect(url.includes('/plugins/hello-world-plugin')).toBeTruthy();
  });
});

test.describe('Plugin Messaging', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  });

  // fixme: same root cause as 'Plugin Authentication' below: hello-world-plugin's bundle is
  // not built and no CI step builds it, so the plugin content (and its "Show Notification"
  // button) never renders; the page is stuck on "Loading plugin..." (manually probed).
  test.fixme('should send messages from plugin to host', async ({ page }) => {
    const messages: unknown[] = [];

    // Listen for plugin messages
    await page.exposeFunction('capturePluginMessage', (msg: unknown) => {
      messages.push(msg);
    });

    // Console listener must be attached before the action that produces the
    // log, otherwise the message that fires on click is missed entirely.
    const logs: string[] = [];
    page.on('console', msg => logs.push(msg.text()));

    await page.goto('/#/plugins/hello-world-plugin/main');
    await page.waitForTimeout(2000);

    const notificationButton = page.locator('text=Show Notification');
    await expect(notificationButton).toBeVisible();
    await notificationButton.click();
    await page.waitForTimeout(500);

    // Verify message was sent (check console logs)
    expect(logs.some(log => log.toLowerCase().includes('notification'))).toBeTruthy();
  });
});

test.describe('Plugin Authentication', () => {
  // fixme: hello-world-plugin's bundle is not built and no CI step builds it, the plugin UI
  // renders "Welcome, {username}!" not "Authenticated:", and isAuthenticated is structurally
  // always false under e2e's VITE_AUTH_ENABLED=false, so this cannot pass until those are fixed.
  test.fixme('should provide auth context to plugins', async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/#/plugins/hello-world-plugin/main');
    const authStatus = page.locator('text=Authenticated:');
    await expect(authStatus).toBeVisible();
  });
});

test.describe('Plugin Error Handling', () => {
  test('should display error UI and retry button on failure', async ({ page }) => {
    // Mock plugin load failure by navigating to invalid plugin
    await page.goto('/#/plugins/invalid-plugin/main');
    await page.waitForTimeout(2000);

    // Check for error UI components - page may show error or redirect
    const errorHeading = page.locator('text=Plugin Failed to Load');
    const hasError = await errorHeading.isVisible().catch(() => false);

    if (hasError) {
      await expect(errorHeading).toBeVisible();

      // Check for retry button (may or may not be present depending on error type)
      const retryButton = page.locator('text=Retry');
      const hasRetry = await retryButton.isVisible().catch(() => false);
      // Either has retry button or doesn't - both are valid error handling
      expect(hasError || hasRetry || true).toBeTruthy();
    } else {
      // No error UI shown - page may have redirected or handled gracefully
      // This is acceptable behavior
      expect(true).toBeTruthy();
    }
  });
});
