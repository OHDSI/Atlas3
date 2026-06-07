import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E test for direct-URL navigation to a Profile view.
 * Verifies the input bar, demographics, and events table render
 * with data sourced from the mocked /person endpoint.
 */
test.describe('Profile direct URL', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  })

  test('renders header, demographics, and events table', async ({ page }) => {
    await page.goto('/#/profiles/SYNPUF1K/1234/42')

    // Person input + source select replaced the single profile-input-bar.
    await expect(page.locator('[data-test="profile-person-input"]')).toBeVisible()
    await expect(page.locator('[data-test="profile-demographics"]')).toBeVisible()
    await expect(page.locator('[data-test="profile-events-table"]')).toBeVisible()
    await expect(page.locator('[data-test="profile-events-table"]')).toContainText('Lisinopril')
  })
})
