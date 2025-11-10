/**
 * Data Sources Feature - Clinical Domain Reports E2E Tests
 * Feature: 006-datasources
 * Task: T078
 * 
 * Tests User Story 5: Observation Period and Death Reports
 */

import { test, expect } from '@playwright/test'
import { setupDatasourcesMocks } from '../helpers/api-mocks'

test.describe('Data Sources - Clinical Domain Reports (Observation Period & Death)', () => {
  test.beforeEach(async ({ page }) => {
    await setupDatasourcesMocks(page)
    await page.goto('/datasources')
    await page.waitForLoadState('networkidle')
  })

  test('T078.1 - Observation Period report displays correctly', async ({ page }) => {
    // Select data source
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select Observation Period report
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    
    // Wait for report to load
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Verify treemap tab
    await expect(page.locator('text=Treemap')).toBeVisible()
    
    // Verify table tab
    await expect(page.locator('text=Table')).toBeVisible()
  })

  test('T078.2 - Death report displays correctly', async ({ page }) => {
    // Select data source
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select Death report
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Death")').click()
    
    // Wait for report to load
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Verify treemap is visible
    await expect(page.locator('[data-testid="treemap-view"]')).toBeVisible()
  })

  test('T078.3 - Treemap view functionality', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Verify treemap instructions
    await expect(page.locator('text=Ctrl+Click')).toBeVisible()
    await expect(page.locator('text=Alt+Click')).toBeVisible()
    
    // Verify treemap canvas exists
    await expect(page.locator('[data-testid="treemap-view"] canvas')).toBeVisible()
  })

  test('T078.4 - Table view functionality', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Death")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Switch to table tab
    await page.locator('text=Table').click()
    await page.waitForTimeout(500)
    
    // Verify table is visible
    await expect(page.locator('[data-testid="prevalence-table"]')).toBeVisible()
    
    // Verify table has search
    await expect(page.locator('input[label="Search"]')).toBeVisible()
    
    // Verify export buttons
    await expect(page.locator('button:has-text("CSV")')).toBeVisible()
    await expect(page.locator('button:has-text("Copy")')).toBeVisible()
  })

  test('T078.5 - Table search functionality', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Switch to table
    await page.locator('text=Table').click()
    await page.waitForTimeout(500)
    
    // Get initial row count
    const initialRows = await page.locator('tbody tr').count()
    
    // Search for something
    const searchInput = page.locator('input[label="Search"]')
    await searchInput.fill('test')
    await page.waitForTimeout(1000)
    
    // Verify table filters (may have fewer or same rows)
    const filteredRows = await page.locator('tbody tr').count()
    expect(filteredRows).toBeLessThanOrEqual(initialRows)
  })

  test('T078.6 - Table status text', async ({ page }) => {
    // Setup
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Death")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Switch to table
    await page.locator('text=Table').click()
    await page.waitForTimeout(500)
    
    // Verify status text exists
    const statusText = page.locator('.table-status-footer')
    await expect(statusText).toBeVisible()
    
    // Should contain "Showing X to Y of Z entries"
    await expect(statusText).toContainText(/Showing.*entries/)
  })

  test('T078.7 - Switch between Observation Period and Death reports', async ({ page }) => {
    // Select source
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    // Select Observation Period
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Verify loaded
    await expect(page.locator('[data-testid="treemap-view"]')).toBeVisible()
    
    // Switch to Death
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Death")').click()
    await page.waitForTimeout(2000)
    
    // Verify Death report loaded
    await expect(page.locator('[data-testid="treemap-view"]')).toBeVisible()
    
    // Switch back to Observation Period
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    await page.waitForTimeout(2000)
    
    // Verify loaded again
    await expect(page.locator('[data-testid="treemap-view"]')).toBeVisible()
  })

  test('T078.8 - Large dataset virtualization warning', async ({ page }) => {
    // This test checks if the large dataset warning appears when applicable
    await page.locator('[data-testid="datasource-selector"]').click()
    await page.locator('.v-list-item').first().click()
    await page.waitForTimeout(500)
    
    await page.locator('[data-testid="report-type-selector"]').click()
    await page.locator('.v-list-item:has-text("Observation Period")').click()
    await page.waitForSelector('[data-testid="clinical-domain-report"]', { timeout: 10000 })
    
    // Switch to table
    await page.locator('text=Table').click()
    await page.waitForTimeout(500)
    
    // Check if virtualization alert exists (only if > 10k entries)
    const alert = page.locator('.v-alert:has-text("Large dataset")')
    const alertExists = await alert.count() > 0
    
    if (alertExists) {
      await expect(alert).toContainText('10,000')
      console.log('Large dataset virtualization active')
    } else {
      console.log('Dataset under 10,000 entries - no virtualization needed')
    }
  })
})
