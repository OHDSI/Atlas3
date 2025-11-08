/**
 * E2E Test: Report Type Switching
 * Tests switching between different report types (T145)
 */
import { test, expect } from '@playwright/test'

test.describe('Report Type Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Navigate to report panel
    await page.waitForSelector('[data-testid="generation-panel"]', { timeout: 10000 })
    const dataSourceTile = page.locator('[data-testid="data-source-tile"]').first()
    await dataSourceTile.click()

    // Wait for report panel
    await page.waitForSelector('[data-testid="report-panel"]', { timeout: 10000 })
  })

  test('should switch to Person report and display demographics', async ({ page }) => {
    // Select Person report from dropdown
    const reportSelector = page.locator('[data-testid="report-selector"]')
    await reportSelector.click()

    const personOption = page.locator('text=Person (Demographics)')
    await personOption.click()

    // Wait for report to load
    await page.waitForTimeout(2000)

    // Verify Person report is displayed
    await expect(page.locator('text=Year of Birth')).toBeVisible()
    await expect(page.locator('text=Demographics')).toBeVisible()

    // Verify charts are rendered
    const charts = page.locator('.v-chart')
    await expect(charts.first()).toBeVisible()
  })

  test('should switch to Condition Eras report and display table', async ({ page }) => {
    // Select Condition Eras report
    const reportSelector = page.locator('[data-testid="report-selector"]')
    await reportSelector.click()

    const conditionErasOption = page.locator('text=Condition Eras')
    await conditionErasOption.click()

    // Wait for report to load
    await page.waitForTimeout(2000)

    // Verify Condition Eras report is displayed
    await expect(page.locator('text=Condition Occurrence')).toBeVisible()

    // Verify tabs are present
    await expect(page.locator('text=Table')).toBeVisible()
    await expect(page.locator('text=Treemap')).toBeVisible()

    // Verify data table is rendered
    const dataTable = page.locator('.v-data-table')
    await expect(dataTable).toBeVisible()
  })

  test('should maintain report selection when switching back and forth', async ({ page }) => {
    const reportSelector = page.locator('[data-testid="report-selector"]')

    // Select Person report
    await reportSelector.click()
    await page.locator('text=Person (Demographics)').click()
    await page.waitForTimeout(1000)

    // Verify Person report
    await expect(page.locator('text=Year of Birth')).toBeVisible()

    // Switch to Drug Eras
    await reportSelector.click()
    await page.locator('text=Drug Eras').click()
    await page.waitForTimeout(1000)

    // Verify Drug Eras report
    await expect(page.locator('text=Drug Era')).toBeVisible()

    // Switch back to Person
    await reportSelector.click()
    await page.locator('text=Person (Demographics)').click()
    await page.waitForTimeout(1000)

    // Verify Person report is shown again
    await expect(page.locator('text=Year of Birth')).toBeVisible()
  })

  test('should display loading state while fetching report data', async ({ page }) => {
    const reportSelector = page.locator('[data-testid="report-selector"]')

    // Select a report
    await reportSelector.click()
    await page.locator('text=Cohort Specific').click()

    // Check for loading indicator
    const loadingIndicator = page.locator('.v-skeleton-loader')
    await expect(loadingIndicator).toBeVisible()

    // Wait for loading to complete
    await page.waitForTimeout(3000)

    // Verify loading indicator is gone
    await expect(loadingIndicator).not.toBeVisible()
  })

  test('should show error message if report fails to load', async ({ page }) => {
    // This test would require mocking a failed API response
    // Placeholder for error handling test
    test.skip()
  })
})
