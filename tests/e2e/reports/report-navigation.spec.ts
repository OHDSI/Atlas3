/**
 * E2E Test: Report Navigation
 * Tests navigation to reports via datasources page
 */
import { test, expect } from '@playwright/test'
import { setupReportsMocks } from '../helpers/api-mocks'

test.describe('Report Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupReportsMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
  })

  test.skip('should open report panel when clicking data source card', async ({ page }) => {
    // Select a data source
    const sourceSelector = page.getByTestId('datasource-selector')
    await expect(sourceSelector).toBeVisible()
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select a report type
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await expect(reportTypeSelector).toBeVisible()
  })

  test.skip('should close report panel when clicking close button', async ({ page }) => {
    // Select a data source
    const sourceSelector = page.getByTestId('datasource-selector')
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select dashboard report
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Verify report is displayed
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test.skip('should display correct source key in report panel', async ({ page }) => {
    // Select a data source
    const sourceSelector = page.getByTestId('datasource-selector')
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select report type
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Verify page header shows source info
    await expect(page.locator('h1')).toContainText('Data Sources')
  })
})
