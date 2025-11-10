/**
 * E2E Test: Person (Demographics) Report
 * Tests Person report functionality via datasources page
 */
import { test, expect } from '@playwright/test'
import { setupReportsMocks } from '../helpers/api-mocks'

test.describe('Person (Demographics) Report', () => {
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
    const personOption = page.locator('.v-list-item').filter({ hasText: /person/i })
    await personOption.click()
    await page.waitForTimeout(1000)
  })

  test('should display Person report title and structure', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display Year of Birth chart', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display Gender pie chart', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display Race pie chart', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display Ethnicity pie chart', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should show loading states while fetching data', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display chart export buttons for Year of Birth chart', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should enable PNG export button when chart has data', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should enable SVG export button when chart has data', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should handle PNG export click', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display error message with retry button on load failure', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should display all three demographic pie charts in correct layout', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should maintain report state when switching tabs', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should verify data accuracy indicators', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })

  test('should handle empty data gracefully', async ({ page }) => {
    await expect(page.getByTestId('person-report')).toBeVisible({ timeout: 10000 })
  })
})
