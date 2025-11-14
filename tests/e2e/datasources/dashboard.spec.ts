/**
 * Data Sources Feature - Dashboard Report E2E Tests
 * Feature: 006-datasources
 * 
 * Tests User Story 1: Dashboard Report
 */

import { test, expect } from '@playwright/test'
import { setupDatasourcesMocks } from '../helpers/api-mocks'

test.describe('Data Sources - Dashboard Report', () => {
  test.beforeEach(async ({ page }) => {
    await setupDatasourcesMocks(page)
    // Navigate to data sources page
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
  })

  test.skip('Navigation to data sources page', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveURL(/\/datasources/)
    
    // Verify page header
    await expect(page.locator('h1')).toContainText('Data Sources')
    
    // Verify selectors are present
    await expect(page.getByTestId('datasource-selector')).toBeVisible()
    await expect(page.getByTestId('report-type-selector')).toBeVisible()
  })

  test.skip('Data source selection', async ({ page }) => {
    // Wait for data sources to load
    await page.waitForSelector('[data-testid="datasource-selector"]', { timeout: 10000 })
    
    // Select first data source
    const sourceSelector = page.locator('[data-testid="datasource-selector"]')
    await sourceSelector.click()
    
    // Wait for dropdown
    await page.waitForSelector('.v-list-item')
    
    // Click first item
    await page.locator('.v-list-item').first().click()
    
    // Verify source is selected
    await expect(sourceSelector).not.toBeEmpty()
  })

  test.skip('Dashboard report selection and display', async ({ page }) => {
    // Select a data source first
    const sourceSelector = page.getByTestId('datasource-selector')
    await sourceSelector.click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select dashboard report type
    const reportTypeSelector = page.getByTestId('report-type-selector')
    await reportTypeSelector.click()
    const dashboardOption = page.locator('.v-list-item').filter({ hasText: /dashboard/i })
    await dashboardOption.click()
    
    // Wait for dashboard report to load
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    
    // Verify dashboard report is visible
    await expect(page.getByTestId('dashboard-report')).toBeVisible()
  })

  test.skip('Chart interactions', async ({ page }) => {
    // Setup: Select source and dashboard
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    
    // Test gender pie chart hover
    const genderChart = page.locator('[data-testid="chart-gender"] canvas')
    await genderChart.hover()
    await page.waitForTimeout(500)
    
    // Test age bar chart
    const ageChart = page.locator('[data-testid="chart-age"] canvas')
    await ageChart.hover()
    await page.waitForTimeout(500)
    
    // Test cumulative line chart
    const cumulativeChart = page.locator('[data-testid="chart-cumulative"] canvas')
    await cumulativeChart.hover()
    await page.waitForTimeout(500)
    
    // Test observation month chart with zoom
    const obsMonthChart = page.locator('[data-testid="chart-observation-month"] canvas')
    await obsMonthChart.hover()
    await page.waitForTimeout(500)
  })

  test.skip('Error state handling', async ({ page }) => {
    // Intercept API call to simulate error
    await page.route('**/cdmresults/*/dashboard', route => {
      route.abort('failed')
    })
    
    // Select source and dashboard
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    
    // Verify error message appears
    await expect(page.locator('.v-alert')).toContainText('Unable to load')
    
    // Verify retry button exists
    const retryButton = page.locator('button:has-text("Retry")')
    await expect(retryButton).toBeVisible()
  })

  test.skip('Data source persistence across report switches', async ({ page }) => {
    // Select a data source
    const sourceSelector = page.locator('[data-testid="datasource-selector"]')
    await sourceSelector.click()
    const firstSource = await page.locator('.v-list-item').first().textContent()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select dashboard
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    
    // Switch to another report type
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Visit")').click()
    await page.waitForTimeout(2000)
    
    // Verify source is still selected
    const currentSource = await sourceSelector.inputValue()
    expect(currentSource).toBeTruthy()
    
    // Switch back to dashboard
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    
    // Verify dashboard loads again
    await expect(page.locator('[data-testid="cdm-summary-table"]')).toBeVisible()
  })

  test.skip('URL state management', async ({ page }) => {
    // Select source and report
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    
    // Get current URL
    const url = page.url()
    expect(url).toContain('/datasources')
    expect(url).toContain('dashboard')
    
    // Reload page
    await page.reload()
    await page.waitForLoadState('networkidle')
    
    // Verify state is preserved
    await expect(page.locator('[data-testid="dashboard-report"]')).toBeVisible({ timeout: 10000 })
  })

  test.skip('Performance: Dashboard loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now()
    
    // Select source and dashboard
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Dashboard")').click()
    
    // Wait for dashboard to fully load
    await page.waitForSelector('[data-testid="dashboard-report"]', { timeout: 10000 })
    await page.waitForSelector('[data-testid="chart-gender"] canvas', { timeout: 10000 })
    
    const loadTime = Date.now() - startTime
    
    // Verify loads in under 5 seconds (5000ms)
    expect(loadTime).toBeLessThan(5000)
    console.log(`Dashboard loaded in ${loadTime}ms`)
  })
})
