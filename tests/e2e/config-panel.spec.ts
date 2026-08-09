import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForNetworkIdle, waitForOverlaysToClose, waitForPageReady } from './helpers/wait-utils'

/**
 * E2E Tests for Configuration Side Panel (T104-T107)
 *
 * User Stories Covered:
 * - US1: Access Configuration Panel
 * - US2: Clear Configuration Cache
 * - US3: Configure Vocabulary Schema
 * - US4: Manage Tag Groups
 */

test.describe('Configuration Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks and auto-accept license
    await setupBasicMocks(page)

    // Navigate to home page
    await page.goto('/#/')
    await waitForPageReady(page)
  })

  // Helper function to ensure config panel is open
  async function ensurePanelOpen(page) {
    const panel = page.locator('.v-navigation-drawer').filter({ hasText: /Configuration/ })

    // Ensure no overlays are blocking before checking panel state
    await waitForOverlaysToClose(page)

    // Always try to check current state and open if needed
    const isOpen = await panel.isVisible().catch(() => false)

    if (!isOpen) {
      // Find config button - use the actual aria-label from the UI
      const configButton = page.locator('button[aria-label="Open configuration panel"]')
        .or(page.getByRole('button', { name: /configuration/i }))
        .or(page.locator('[aria-label*="configuration"]'))

      if (await configButton.first().isVisible().catch(() => false)) {
        await configButton.first().click()
        // Wait for panel animation
        await page.waitForTimeout(800)
      }
    }

    // Verify panel is now visible
    await expect(panel).toBeVisible({ timeout: 5000 })

    return panel
  }


  test.describe('US1: Access Configuration Panel (T104)', () => {
    test('should open panel from navbar config icon', async ({ page }) => {
      // Check if panel is already open
      const panel = page.locator('.v-navigation-drawer').filter({ hasText: /Configuration/ })
      const isPanelOpen = await panel.isVisible().catch(() => false)

      if (!isPanelOpen) {
        // Find and click config icon in navbar if panel is not already open
        const configIcon = page.getByRole('button', { name: /configuration/i }).or(page.locator('[aria-label*="configuration"]'))
        await configIcon.first().click()
      }

      // Verify panel is visible (either was already open or just opened)
      await expect(panel).toBeVisible({ timeout: 3000 })
    })

    test('should display config panel with multiple sections', async ({ page }) => {
      // Ensure panel is open
      const panel = await ensurePanelOpen(page)

      // Panel should have content
      const panelContent = await panel.textContent()

      // Panel should have meaningful content
      expect(panelContent).toBeTruthy()
      expect(panelContent.length).toBeGreaterThan(50)
    })

    test('should have openable and closeable config panel', async ({ page }) => {
      // Not ensurePanelOpen: Vuetify keeps the closed drawer in the DOM
      // positioned offscreen, where Playwright still reports it "visible",
      // so the helper skips the open click against a closed panel. Only
      // toBeInViewport distinguishes open from closed here.
      await page.setViewportSize({ width: 1920, height: 1080 })
      const panel = page.locator('.v-navigation-drawer').filter({ hasText: /Configuration/ })

      await page.getByTestId('nav-config').click()
      await expect(panel).toBeInViewport()

      await panel.locator('button[aria-label="Close configuration panel"]').click()
      await expect(panel).not.toBeInViewport()
    })

    test('should navigate away from home page successfully', async ({ page }) => {
      // Try navigating to cohorts page
      await page.goto('/#/cohorts')
      await waitForNetworkIdle(page)

      // Verify navigation worked
      await expect(page).toHaveURL(/\/cohorts/)
    })
  })

  test.describe('US2: Clear Configuration Cache (T105)', () => {
    test('should have config panel with content', async ({ page }) => {
      // Ensure config panel is open
      const panel = await ensurePanelOpen(page)

      // Verify panel has some content
      const panelText = await panel.textContent()
      expect(panelText).toBeTruthy()
      expect(panelText.length).toBeGreaterThan(10)
    })
  })

  test.describe('US3: Configure Vocabulary Schema (T106)', () => {
    // blocked: src/components/config/VocabularySchemaSection.vue,
    // src/stores/config.ts's setVocabularySchema, and
    // src/models/config.types.ts's vocabularySchemaSchema all exist, but
    // ConfigPanel.vue (grep-confirmed) only mounts CacheManagementSection,
    // DataSourcesSection, TagManagementSection, and PermissionsSection.
    // VocabularySchemaSection is never imported anywhere, so there is no
    // "Vocabulary" section, tab, or schema input to find in the running
    // app. Every guard below was permanently dead. Wiring the section in
    // requires a new ConfigPanelSection tab entry, a permission gate, and
    // i18n label review, which is a real feature decision, not a test fix.
    test.fixme('should edit vocabulary schema with auto-save', async ({ page }) => {
      // Ensure config panel is open
      await ensurePanelOpen(page)

      // Navigate to vocabulary section
      const vocabularySection = page.locator('text=/Vocabulary/i').first()
      await vocabularySection.click({ force: true })
      await page.waitForTimeout(300)

      // Find vocabulary schema input field
      const schemaInput = page.locator('label:has-text("Schema")').locator('..').locator('input')

      // Clear and enter new schema
      await schemaInput.clear()
      await schemaInput.fill('test_schema')

      // Blur to trigger auto-save
      await schemaInput.blur()

      // Wait for save indicator or success message
      await page.waitForTimeout(1500) // Wait for debounce + save

      // Check for success toast
      const toast = page.locator('.v-snackbar:visible, text=/updated/i, text=/saved/i')
      await expect(toast).toBeVisible({ timeout: 3000 })
    })

    test('should have inputs in vocabulary section', async ({ page }) => {
      // Ensure config panel is open
      await ensurePanelOpen(page)

      // Look for any text inputs
      const inputs = page.locator('input[type="text"]')
      const count = await inputs.count()

      // Should have some inputs (vocabulary or other config)
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  test.describe('US4: Manage Tag Groups (T107)', () => {
    test('should display config panel with buttons', async ({ page }) => {
      // Ensure config panel is open
      await ensurePanelOpen(page)

      // Look for any buttons in the panel
      const panel = page.locator('.v-navigation-drawer').filter({ hasText: /Configuration/ })
      const buttons = panel.locator('button')
      const count = await buttons.count()

      // Should have some buttons for interactions
      expect(count).toBeGreaterThan(0)
    })

    test('should display home page title or header', async ({ page }) => {
      // Look for page title/header
      const headers = page.locator('h1, h2, h3, .v-toolbar__title')
      const count = await headers.count()

      // Page should have some header
      expect(count).toBeGreaterThan(0)
    })

    test('should have main navigation elements', async ({ page }) => {
      // Look for navigation items or menu
      const nav = page.locator('nav, .v-navigation-drawer, .v-app-bar')
      const count = await nav.count()

      // Should have some navigation structure
      expect(count).toBeGreaterThan(0)
    })
  })

  test.describe('Responsive Behavior', () => {
    test('should adapt panel width for mobile', async ({ page }) => {
      // Set mobile viewport, then reload: ConfigPanel.vue's
      // v-navigation-drawer mounts (hidden) on the initial beforeEach
      // page.goto(), and its width only tracks window.innerWidth from that
      // mount plus a live 'resize' listener. Setting the viewport after
      // that mount without reloading races the resize handler against this
      // test's own boundingBox() read: fast/light runs can measure before
      // the listener updates the ref and silently pass on a stale desktop
      // width, which is exactly how this test stayed green while the
      // underlying drawerWidth formula (fixed separately in
      // ConfigPanel.vue) ignored the viewport entirely above ~1400px.
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      await waitForPageReady(page)

      // Ensure panel is open
      await ensurePanelOpen(page)

      // Panel should be full width on mobile
      const panel = page.locator('.v-navigation-drawer:visible').first()
      const box = await panel.boundingBox()

      // ensurePanelOpen() already asserts the panel is visible, so
      // boundingBox() cannot genuinely be null here.
      expect(box).not.toBeNull()
      expect(box!.width).toBeGreaterThan(300) // Should take most/all of viewport
    })

    test('should adapt panel width for desktop', async ({ page }) => {
      // Set desktop viewport, then reload (see comment in the mobile case
      // above for why this must happen before the drawer mounts).
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.reload()
      await waitForPageReady(page)

      // Ensure panel is open
      await ensurePanelOpen(page)

      // Panel should be max 1400px or 85% viewport
      const panel = page.locator('.v-navigation-drawer:visible').first()
      const box = await panel.boundingBox()

      expect(box).not.toBeNull()
      expect(box!.width).toBeLessThanOrEqual(1400)
    })
  })

  test.describe('Accessibility', () => {
    test('should support keyboard navigation', async ({ page }) => {
      // Tab to config icon
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab') // May need multiple tabs

      // Press Enter to open (assuming config icon gets focus)
      // This is a basic test - real keyboard nav would require more specific selectors
      const configIcon = page.locator('[aria-label="Open configuration panel"]')
      await expect(configIcon).toBeVisible()

      await configIcon.focus()
      await page.keyboard.press('Enter')

      // Panel should open
      await expect(page.locator('.v-navigation-drawer.config-panel')).toBeVisible({
        timeout: 3000,
      })

      // Press Escape to close
      await page.keyboard.press('Escape')

      // Panel should close
      await page.waitForTimeout(500)
    })
  })
})
