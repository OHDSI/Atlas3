import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E test for the profile events table's filtering surface:
 * domain chips and the free-text search field.
 */
test.describe('Profile filtering', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await page.goto('/profiles/SYNPUF1K/1234/42')
    await expect(page.locator('[data-test="profile-events-table"]')).toContainText('Lisinopril')
  })

  test('add Drug chip filters table to drug rows only', async ({ page }) => {
    await page.locator('[data-test="profile-chip-add"]').click()
    // The "+ Domain" menu opens a v-list; pick the "Drug" item.
    await page
      .getByRole('listitem')
      .filter({ hasText: /^Drug \(/ })
      .first()
      .click()

    // After filtering, the v-data-table renders only Drug rows.
    const rows = page.locator('[data-test="profile-table"] tbody tr')
    await expect(rows.first()).toBeVisible()
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toContainText('Drug')
    }
  })

  test('search narrows table', async ({ page }) => {
    await page.locator('[data-test="profile-search"] input').fill('hypertension')
    const rows = page.locator('[data-test="profile-table"] tbody tr')
    await expect(rows.first()).toContainText('hypertension', { ignoreCase: true })
  })
})
