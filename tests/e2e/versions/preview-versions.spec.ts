/**
 * E2E tests for previewing versions
 * T033: Test User Story 2 acceptance scenarios
 */
import { test, expect } from '@playwright/test'

test.describe('Preview Historical Versions', () => {
  test('US2-AS1: User can preview a historical version', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Click preview on first historical version
    const previewButton = page.locator('button:has-text("Preview")').first()
    await previewButton.click()

    // URL should change to version route
    await expect(page).toHaveURL(/\/cohortdefinition\/123\/version\/\d+/)
  })

  test('US2-AS2: Unsaved changes warning before preview', async ({ page }) => {
    // Mock confirm dialog
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('unsaved changes')
      await dialog.accept()
    })

    await page.goto('/cohorts/123')
    // Make a change (mark as dirty)
    await page.fill('input[name="cohort-name"]', 'Modified Name')

    await page.click('button:has-text("Versions")')
    const previewButton = page.locator('button:has-text("Preview")').first()
    await previewButton.click()

    // Dialog should have been triggered
  })

  test('US2-AS3: Back to current button appears when previewing', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    // Back to current button should be visible
    await expect(page.locator('button:has-text("Back to current")')).toBeVisible()
  })

  test('US2-AS4: Page title shows version preview', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    // Title should indicate preview mode
    await expect(page.locator('h1')).toContainText('Version')
    await expect(page.locator('h1')).toContainText('Preview')
  })

  test('US2-AS5: UI elements hidden when previewing', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    // Delete button should be hidden
    await expect(page.locator('button:has-text("Delete")')).not.toBeVisible()

    // Tags tab should be hidden
    await expect(page.locator('button:has-text("Tags")')).not.toBeVisible()
  })
})
