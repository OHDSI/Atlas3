import { test, expect } from '@playwright/test'
import type { Route } from '@playwright/test'
import { setupBasicMocks, setupAnalysisListMocks } from './helpers/api-mocks'

// setupAnalysisListMocks only covers the characterizations *list* endpoint
// (id 1, "Diabetes baseline characterization"). Opening that row into the
// workbench needs its own design/execution/results mocks, which is what the
// routes below add. They're registered after the shared helpers, so they win
// over the generic `**/cohort-characterization/*/design` -> '{}' catch-all in
// api-mocks.ts (Playwright runs the most-recently-registered matching route
// first).
async function setupCharacterizationDetailMocks(page: import('@playwright/test').Page) {
  await page.route('**/cohort-characterization/1/design', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 1,
        name: 'Diabetes baseline characterization',
        description: 'Demographics and comorbidities at index',
        cohorts: [{ id: 10, name: 'Diabetes cohort' }],
        featureAnalyses: [{ id: 1, name: 'Demographics' }],
        stratas: [],
      }),
    })
  })

  await page.route('**/cohort-characterization/1/generation', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, status: 'COMPLETED', sourceKey: 'CDM', startTime: 1000, endTime: 2000, duration: 1000 },
      ]),
    })
  })

  await page.route('**/cohort-characterization/generation/1', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, status: 'COMPLETED', sourceKey: 'CDM', startTime: 1000, endTime: 2000, duration: 1000 }),
    })
  })

  await page.route('**/cohort-characterization/generation/1/result/count', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '1' })
  })

  await page.route('**/cohort-characterization/generation/1/result', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          analysisId: 1,
          analysisName: 'DemographicsGender',
          covariateId: 101,
          covariateName: 'Male',
          conceptId: 8507,
          domainId: 'Demographics',
          cohortId: 10,
          cohortName: 'Diabetes cohort',
          count: 500,
          pct: 0.5,
        },
      ]),
    })
  })
}

test.describe('Characterization workbench', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
    await setupAnalysisListMocks(page)
    await setupCharacterizationDetailMocks(page)
  })

  test('navigates from list to workbench', async ({ page }) => {
    await page.goto('/#/characterizations')
    await expect(page.getByTestId('characterizations-table')).toBeVisible()
    const firstRow = page.getByTestId('characterizations-table-row-name').first()
    await firstRow.click()
    await expect(page.getByTestId('char-builder-name')).toHaveValue('Diabetes baseline characterization')
    await expect(page.getByTestId('char-builder-workbench')).toBeVisible()
    await expect(page.getByTestId('char-toolbar-mode-table1')).toBeVisible()
  })

  test('switches view modes', async ({ page }) => {
    await page.goto('/#/characterizations')
    const firstRow = page.getByTestId('characterizations-table-row-name').first()
    await firstRow.click()
    await page.getByTestId('char-toolbar-mode-perAnalysis').click()
    // Deterministic: the mocked generation result produces exactly one
    // prevalence row for analysisId 1, so its card must render.
    await expect(page.getByTestId('char-results-prevalence-1')).toBeVisible()
  })

  test('opens and closes the configure inspector', async ({ page }) => {
    await page.goto('/#/characterizations')
    const firstRow = page.getByTestId('characterizations-table-row-name').first()
    await firstRow.click()
    await page.getByTestId('char-toolbar-configure').click()
    await expect(page.getByTestId('configure-inspector')).toBeVisible()
    await page.getByTestId('configure-close').click()
    await expect(page.getByTestId('configure-inspector')).toBeHidden()
  })

  test('redirects old results URL to workbench with ?run=', async ({ page }) => {
    await page.goto('/#/characterizations/1/results/1')
    await expect(page).toHaveURL(/\/characterizations\/1\?run=1$/)
  })
})
