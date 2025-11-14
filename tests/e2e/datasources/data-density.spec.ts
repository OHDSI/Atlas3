/**
 * Data Sources Feature - Data Density Report E2E Tests
 * Feature: 006-datasources
 * 
 * Tests User Story 2: Data Density Report
 */

import { test, expect } from '@playwright/test'
import { setupDatasourcesMocks } from '../helpers/api-mocks'

test.describe('Data Sources - Data Density Report', () => {
  test.beforeEach(async ({ page }) => {
    await setupDatasourcesMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
  })

  test.skip('Data Density report selection', async ({ page }) => {
    // Select data source
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select Data Density report
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Data Density")').click()
    
    // Wait for report to load
    await page.waitForSelector('[data-testid="datadensity-report"]', { timeout: 10000 })
    
    // Verify report is visible
    await expect(page.locator('[data-testid="datadensity-report"]')).toBeVisible()
  })

  test.skip('Multi-line charts display', async ({ page }) => {
    // Setup: Select source and report
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Data Density")').click()
    await page.waitForSelector('[data-testid="datadensity-report"]', { timeout: 10000 })
    
    // Verify all 3 charts are present
    await expect(page.locator('[data-testid="chart-total-records"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-records-per-person"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-concepts-per-person"]')).toBeVisible()
  })

  test.skip('Legend interactions', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Data Density")').click()
    await page.waitForSelector('[data-testid="datadensity-report"]', { timeout: 10000 })
    
    // Check if legend exists on multi-line charts
    const totalRecordsChart = page.locator('[data-testid="chart-total-records"]')
    await expect(totalRecordsChart).toBeVisible()
    
    // Verify canvas is rendered (chart loaded)
    await expect(totalRecordsChart.locator('canvas')).toBeVisible()
  })

  test.skip('Time series display', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Data Density")').click()
    await page.waitForSelector('[data-testid="datadensity-report"]', { timeout: 10000 })
    
    // Verify time series charts render
    const charts = await page.locator('[data-testid^="chart-"] canvas').count()
    expect(charts).toBeGreaterThanOrEqual(3)
  })

  test.skip('Error handling', async ({ page }) => {
    // Intercept API to simulate error
    await page.route('**/cdmresults/*/datadensity', route => {
      route.abort('failed')
    })
    
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Data Density")').click()
    
    // Verify error message
    await expect(page.locator('.v-alert')).toContainText('Unable to load')
  })
})
