import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E test for the highlights side panel:
 * - selecting a concept and applying a swatch
 * - clearing all highlights
 */
test.describe('Profile highlights', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/profiles/SYNPUF1K/1234/42')
    await expect(page.locator('[data-test="highlights-panel"]')).toBeVisible()
  })

  test('selecting a concept then a swatch applies a highlight color', async ({ page }) => {
    const checkbox = page.locator('[data-test="highlight-concept-cb-1308216"] input')
    await expect(checkbox).toBeVisible()
    await checkbox.check()
    await page.locator('[data-test="highlight-swatch"]').first().click()
    await expect(checkbox).toBeChecked()
  })

  test('clear-all empties the highlights map', async ({ page }) => {
    const checkbox = page.locator('[data-test="highlight-concept-cb-1308216"] input')
    await expect(checkbox).toBeVisible()
    await checkbox.check()
    await page.locator('[data-test="highlight-swatch"]').first().click()
    await page.locator('[data-test="highlight-clear"]').click()
    await expect(page.locator('[data-test="highlights-panel"]')).toBeVisible()
  })
})
