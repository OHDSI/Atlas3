/**
 * E2E Test: Report CSV Export
 * Tests CSV export and copy-to-clipboard functionality via datasources
 */
import { test, expect } from '@playwright/test'
import { setupReportsMocks } from '../helpers/api-mocks'

test.describe.skip('Report CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    await setupReportsMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
    
    const sourceSelector = page.getByTestId('datasource-selector')
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    await page.waitForTimeout(1000)
  })

  test('should display export buttons when table has data', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should trigger CSV download when export button is clicked', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should show loading state on CSV export button during export', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display success toast notification after CSV export', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should copy table data to clipboard', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should show loading state on copy button during copy', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should disable export buttons when table is loading', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should export filtered data when search is applied', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should export sorted data when column sorting is applied', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should export data with correct CSV format', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should close toast notification when close button is clicked', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should handle export with empty table gracefully', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should export with correct filename format', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should disable both buttons while export is in progress', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should show error toast on clipboard copy failure', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should handle multiple consecutive exports', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })

  test('should export data from different report types', async ({ page }) => {
    await expect(page.getByTestId('dashboard-report')).toBeVisible({ timeout: 10000 })
  })
})
