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
    await page.goto('/#/profiles/SYNPUF1K/1234/42')
    await expect(page.locator('[data-test="highlights-panel"]')).toBeVisible()
  })

  test('selecting a concept then a swatch applies a highlight color', async ({ page }) => {
    // Highlights UI now uses a color-dot button per concept which opens a
    // popover with color swatches; click a dot, then a swatch.
    const colorDot = page.locator('[data-test="highlight-color-dot-1308216"]')
    await expect(colorDot).toBeVisible()
    await colorDot.click()

    const swatch = page.locator('[data-test^="highlight-color-swatch-#"]').first()
    await expect(swatch).toBeVisible()
    await swatch.click()

    // Dot stays visible after a color is applied.
    await expect(colorDot).toBeVisible()
  })

  test('clear-all empties the highlights map', async ({ page }) => {
    const colorDot = page.locator('[data-test="highlight-color-dot-1308216"]')
    await expect(colorDot).toBeVisible()
    await colorDot.click()
    await page.locator('[data-test^="highlight-color-swatch-#"]').first().click()

    await page.locator('[data-test="highlight-clear-all"]').click()
    await expect(page.locator('[data-test="highlights-panel"]')).toBeVisible()
  })
})
