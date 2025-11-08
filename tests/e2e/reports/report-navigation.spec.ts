/**
 * E2E Test: Report Navigation
 * Tests navigation to report panel from data source cards (T142)
 */
import { test, expect } from '@playwright/test'

test.describe('Report Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Navigate to a cohort with generated data
    // This assumes there's a cohort available in the test environment
  })

  test('should open report panel when clicking data source card', async ({ page }) => {
    // Wait for generation panel to load
    await page.waitForSelector('[data-testid="generation-panel"]', { timeout: 10000 })

    // Click on a data source tile
    const dataSourceTile = page.locator('[data-testid="data-source-tile"]').first()
    await dataSourceTile.click()

    // Verify report panel is displayed
    const reportPanel = page.locator('[data-testid="report-panel"]')
    await expect(reportPanel).toBeVisible()

    // Verify report panel title
    await expect(page.locator('text=Cohort Reports')).toBeVisible()

    // Verify action buttons are present
    await expect(page.locator('text=Full Analysis')).toBeVisible()
    await expect(page.locator('text=Quick Analysis')).toBeVisible()
    await expect(page.locator('text=Utilization')).toBeVisible()

    // Verify report type selector is present
    await expect(page.locator('[data-testid="report-selector"]')).toBeVisible()
  })

  test('should close report panel when clicking close button', async ({ page }) => {
    // Open report panel
    await page.waitForSelector('[data-testid="generation-panel"]', { timeout: 10000 })
    const dataSourceTile = page.locator('[data-testid="data-source-tile"]').first()
    await dataSourceTile.click()

    // Wait for report panel to be visible
    const reportPanel = page.locator('[data-testid="report-panel"]')
    await expect(reportPanel).toBeVisible()

    // Click close button
    const closeButton = page.locator('[data-testid="report-panel-close"]')
    await closeButton.click()

    // Verify report panel is hidden
    await expect(reportPanel).not.toBeVisible()

    // Verify data source grid is visible again
    await expect(page.locator('[data-testid="data-source-grid"]')).toBeVisible()
  })

  test('should display correct source key in report panel', async ({ page }) => {
    // Open report panel
    await page.waitForSelector('[data-testid="generation-panel"]', { timeout: 10000 })

    // Get the source key from the first data source tile
    const sourceKeyElement = page.locator('[data-testid="data-source-key"]').first()
    const sourceKey = await sourceKeyElement.textContent()

    // Click the tile
    const dataSourceTile = page.locator('[data-testid="data-source-tile"]').first()
    await dataSourceTile.click()

    // Verify source key chip in report panel
    const sourceKeyChip = page.locator('[data-testid="report-source-key"]')
    await expect(sourceKeyChip).toContainText(sourceKey || '')
  })
})
