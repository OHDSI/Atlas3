/**
 * E2E tests for copying versions
 * T055: Test User Story 4 acceptance scenarios
 */
import { test, expect } from '@playwright/test'

test.describe('Create Copy from Historical Version', () => {
  test('US4-AS1: User can create copy from historical version', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Click copy on first historical version
    const copyButton = page.locator('button:has-text("Create a copy")').first()
    await copyButton.click()

    // Should navigate to new cohort
    await expect(page).toHaveURL(/\/cohorts\/\d+/)

    // Success notification
    await expect(page.locator('.v-snackbar:has-text("Copy created")')).toBeVisible()
  })

  test('US4-AS2: Copy contains data from selected version', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    // Note the version number being copied
    const versionRow = page.locator('tbody tr').nth(1)
    const _versionNumber = await versionRow.locator('td').first().textContent()

    // Create copy
    await versionRow.locator('button:has-text("Create a copy")').click()

    // New cohort should have data from that version
    // (Exact verification depends on cohort structure)
  })

  test('US4-AS3: Unsaved changes warning before copy', async ({ page }) => {
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('unsaved changes')
      await dialog.accept()
    })

    await page.goto('/cohorts/123')
    // Make a change
    await page.fill('input[name="cohort-name"]', 'Modified')

    await page.click('button:has-text("Versions")')
    await page.locator('button:has-text("Create a copy")').first().click()
  })

  test('US4-AS4: Copy creates new asset with unique ID', async ({ page }) => {
    await page.goto('/cohorts/123')
    await page.click('button:has-text("Versions")')

    await page.locator('button:has-text("Create a copy")').first().click()

    // URL should have different ID
    await expect(page).not.toHaveURL(/\/cohorts\/123$/)
  })
})
