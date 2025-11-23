/**
 * E2E tests for saving preview as current
 * T061: Test User Story 5 acceptance scenarios
 */
import { test, expect } from '@playwright/test'

test.describe('Save Preview as Current Version', () => {
  test('US5-AS1: Save button tooltip changes when previewing', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    // Save button should have different tooltip
    const saveButton = page.locator('button:has-text("Save")')
    await expect(saveButton).toHaveAttribute('title', /Save as current/)
  })

  test('US5-AS2: Confirmation dialog before saving', async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('Save as current')
      await dialog.accept()
    })

    await page.goto('/cohorts/123/version/5')
    await page.click('button:has-text("Save")')
  })

  test('US5-AS3: Preview state cleared after save', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    await page.click('button:has-text("Save")')

    // Should return to normal view
    await expect(page).toHaveURL(/\/cohorts\/123$/)
    await expect(page.locator('button:has-text("Back to current")')).not.toBeVisible()
  })

  test('US5-AS4: New version created after save', async ({ page }) => {
    await page.goto('/cohorts/123/version/5')

    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    await page.click('button:has-text("Save")')

    // Check versions tab for new version
    await page.click('button:has-text("Versions")')
    const rows = page.locator('tbody tr')
    const count = await rows.count()

    // Should have one more version than before
    expect(count).toBeGreaterThan(1)
  })

  test('US5-AS5: User can cancel save operation', async ({ page }) => {
    page.on('dialog', async dialog => {
      await dialog.dismiss()
    })

    await page.goto('/cohorts/123/version/5')
    await page.click('button:has-text("Save")')

    // Should still be in preview mode
    await expect(page).toHaveURL(/\/version\/5/)
    await expect(page.locator('button:has-text("Back to current")')).toBeVisible()
  })
})
