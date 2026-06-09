import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

/**
 * E2E test for the cohort-sample → profile link.
 *
 * The cohort samples UI (CohortSamplesPanel + CohortSampleDetail) is not
 * reachable via a dedicated URL — it lives inside the cohort generation
 * drawer (GenerationPanel) which is opened from the cohorts list. Reaching
 * the personId link in CohortSampleDetail therefore requires:
 *   1. /cohorts list with a generated cohort
 *   2. Opening the generation drawer
 *   3. Clicking a data-source tile
 *   4. Switching to the Samples tab
 *   5. Creating or selecting a sample whose `elements` include a personId
 *
 * The cohortsample REST endpoints (`/cohortsample/...`) have no fixtures or
 * mocks in the existing E2E test infrastructure, and no other E2E spec
 * exercises the samples UI yet. Authoring all of that just for a single
 * router-link click is out of scope for the Profiles feature work — the
 * URL-building logic in `profileRouteFor` is already covered by unit tests,
 * and `CohortSampleDetail` has component-level coverage of the link.
 *
 * TODO(profiles): When cohort-sample E2E coverage exists (and a fixture set
 * for `/cohortsample/{cohortId}/{sourceKey}` is in place), unskip this test
 * and walk the full drawer flow.
 */
test.describe('Profile from cohort sample', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  })

  test.skip('clicking a personId row navigates to that person profile', async ({ page }) => {
    // Placeholder — see TODO above. Skipped until the cohort-samples flow
    // has E2E mocks and fixtures.
    await page.goto('/#/cohorts')
    const link = page.locator('[data-test="cohort-sample-profile-link"]').first()
    await link.click()
    await expect(page).toHaveURL(/\/profiles\/.+\/\d+/)
    await expect(page.locator('[data-test="profile-demographics"]')).toBeVisible()
  })
})
