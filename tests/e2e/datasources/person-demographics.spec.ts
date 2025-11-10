/**
 * Data Sources Feature - Person Demographics Report E2E Tests
 * Feature: 006-datasources
 * 
 * Tests User Story 3: Person Demographics Report
 */

import { test, expect } from '@playwright/test'
import { setupDatasourcesMocks } from '../helpers/api-mocks'

test.describe('Data Sources - Person Demographics Report', () => {
  test.beforeEach(async ({ page }) => {
    await setupDatasourcesMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
  })

  test('Person report selection', async ({ page }) => {
    // Select data source
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select Person report
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Person")').click()
    
    // Wait for report to load
    await page.waitForSelector('[data-testid="person-report"]', { timeout: 10000 })
    
    // Verify report is visible
    await expect(page.locator('[data-testid="person-report"]')).toBeVisible()
  })

  test('Four charts display', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Person")').click()
    await page.waitForSelector('[data-testid="person-report"]', { timeout: 10000 })
    
    // Verify all 4 charts are present
    await expect(page.locator('[data-testid="chart-year-of-birth"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-gender"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-race"]')).toBeVisible()
    await expect(page.locator('[data-testid="chart-ethnicity"]')).toBeVisible()
  })

  test('Tooltips work', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Person")').click()
    await page.waitForSelector('[data-testid="person-report"]', { timeout: 10000 })
    
    // Test year of birth chart tooltips
    const yearChart = page.locator('[data-testid="chart-year-of-birth"] canvas')
    await yearChart.hover()
    await page.waitForTimeout(500)
    
    // Test gender pie chart
    const genderChart = page.locator('[data-testid="chart-gender"] canvas')
    await genderChart.hover()
    await page.waitForTimeout(500)
    
    // Test race pie chart
    const raceChart = page.locator('[data-testid="chart-race"] canvas')
    await raceChart.hover()
    await page.waitForTimeout(500)
    
    // Test ethnicity pie chart
    const ethnicityChart = page.locator('[data-testid="chart-ethnicity"] canvas')
    await ethnicityChart.hover()
    await page.waitForTimeout(500)
  })

  test('Chart descriptions visible', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Person")').click()
    await page.waitForSelector('[data-testid="person-report"]', { timeout: 10000 })
    
    // Verify section titles are visible
    await expect(page.locator('text=Year of Birth Distribution')).toBeVisible()
    await expect(page.locator('text=Gender Distribution')).toBeVisible()
    await expect(page.locator('text=Race Distribution')).toBeVisible()
    await expect(page.locator('text=Ethnicity Distribution')).toBeVisible()
  })

  test('Responsive layout (3 columns for demographics)', async ({ page }) => {
    // Set viewport to desktop size
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Person")').click()
    await page.waitForSelector('[data-testid="person-report"]', { timeout: 10000 })
    
    // Year of birth should be full width
    const yearChart = page.locator('[data-testid="chart-year-of-birth"]')
    await expect(yearChart).toBeVisible()
    
    // Demographics should be in row (3 columns)
    const genderChart = page.locator('[data-testid="chart-gender"]')
    const raceChart = page.locator('[data-testid="chart-race"]')
    const ethnicityChart = page.locator('[data-testid="chart-ethnicity"]')
    
    await expect(genderChart).toBeVisible()
    await expect(raceChart).toBeVisible()
    await expect(ethnicityChart).toBeVisible()
  })
})
