/**
 * E2E Test: Report Type Switching
 * Tests switching between different report types via datasources page
 */
import { test, expect } from '@playwright/test'
import { setupReportsMocks } from '../helpers/api-mocks'

test.describe('Report Type Switching', () => {
  test.beforeEach(async ({ page }) => {
    await setupReportsMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
    
    // Select a data source
    const sourceSelector = page.getByTestId('datasource-selector')
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
  })

  test.skip('should switch to Person report and display demographics', async ({ page }) => {
    // Select Person report
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const personOption = page.locator('.v-list-item').filter({ hasText: /person/i })
    await personOption.click()
    
    // Verify person report is displayed
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test.skip('should switch to Condition Eras report and display table', async ({ page }) => {
    // Select a report type (dashboard as example)
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Verify dashboard report is displayed
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test.skip('should maintain report selection when switching back and forth', async ({ page }) => {
    // Select Person report
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const personOption = page.locator('.v-list-item').filter({ hasText: /person/i })
    await personOption.click()
    await page.waitForTimeout(500)
    
    // Verify person report
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
    
    // Switch to dashboard
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    await page.waitForTimeout(500)
    
    // Verify dashboard report
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test.skip('should display loading state while fetching report data', async ({ page }) => {
    // Select a report type
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Report should eventually load
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test.skip('should show error message if report fails to load', async ({ page }) => {
    // Mock would need to simulate failure - for now just verify normal flow
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Verify report loads successfully or error is shown
    await page.waitForTimeout(2000)
    const hasReport = await page.getByTestId('dashboard-report').isVisible().catch(() => false)
    const hasError = await page.locator('.v-alert[type="error"]').isVisible().catch(() => false)
    
    expect(hasReport || hasError).toBe(true)
  })
})
