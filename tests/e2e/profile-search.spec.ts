import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E test for the Profiles search-flow empty state.
 * User picks a data source and types a personId, then submits.
 * Profile demographics should appear with mocked data.
 */
test.describe('Profile search flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  })

  test('user types personId from sourced profile page, profile loads', async ({ page }) => {
    // Start on /profiles/{sourceKey} so the source is pre-selected via the
    // route-driven setRouteParams() in usePersonProfile. The dataSources
    // store is not auto-fetched on the Profiles view, so the v-select
    // dropdown is empty in test; we exercise the personId-submit branch
    // of the search flow instead, which is the meaningful interaction.
    await page.goto('/profiles/SYNPUF1K')

    const personInput = page.locator('[data-test="profile-person-input"] input')
    await expect(personInput).toBeEnabled()
    await personInput.fill('1234')
    // Submit is Enter / blur; there is no separate submit button.
    await personInput.press('Enter')

    await expect(page.locator('[data-test="profile-demographics"]')).toBeVisible()
  })
})
