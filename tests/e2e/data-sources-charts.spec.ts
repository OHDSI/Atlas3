/**
 * E2E Smoke Tests: Data Sources Chart-Parity Reports
 *
 * Smoke-tests the three chart-parity report pages wired up against
 * mocked WebAPI responses:
 *   - Data Density
 *   - Observation Period
 *   - Death
 *
 * The tests navigate directly to the datasources view with explicit
 * sourceKey + reportType URL params (the view initializes from the
 * route), then assert that the expected chart testids are rendered.
 *
 * Note: setupChartParityMocks patches window.fetch to dedupe concurrent
 * calls to /source/sources. The datasources view kicks off two
 * simultaneous source fetches on load (the store and the TrexSQL cache
 * composable mounted via the config panel); without dedup, the second
 * aborts the first and surfaces a bogus "Unable to load data sources"
 * error even though both would otherwise succeed.
 */

import { test, expect, type Page } from '@playwright/test'
import { setupChartParityMocks } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'

// The first mock datasource defined in fixtures/datasources.ts
const SOURCE_KEY = 'SYNPUF1K'

test.describe('DataSources Chart-Parity Reports', () => {
  test.beforeEach(async ({ page }) => {
    await setupChartParityMocks(page)
  })

  async function goToReport(page: Page, reportType: string) {
    await page.goto(`/#/datasources/${SOURCE_KEY}/${reportType}`)
    await waitForPageReady(page)
  }

  test('Data Density report renders concepts-per-person chart', async ({ page }) => {
    await goToReport(page, 'datadensity')

    const report = page.getByTestId('datadensity-report')
    await expect(report).toBeVisible({ timeout: 10000 })

    // Concepts-per-person chart is the key chart-parity addition for Data Density.
    const conceptsPerPerson = page.locator('[data-testid=concepts-per-person-chart] canvas')
    await expect(conceptsPerPerson).toBeVisible({ timeout: 10000 })
  })

  test('Observation Period report renders all chart testids', async ({ page }) => {
    await goToReport(page, 'observationPeriod')

    const report = page.getByTestId('observation-period-report')
    await expect(report).toBeVisible({ timeout: 10000 })

    // All nine chart sections should be present in the DOM. Use
    // toBeAttached (not toBeVisible) because some charts are below the
    // fold and may not be in the viewport at load time.
    const chartTestIds = [
      'age-at-first-chart',
      'observation-length-chart',
      'cumulative-observation-chart',
      'observed-by-month-chart',
      'age-by-gender-chart',
      'duration-by-gender-chart',
      'duration-by-age-decile-chart',
      'persons-continuous-by-year-chart',
      'observation-periods-per-person-chart'
    ]

    for (const testId of chartTestIds) {
      await expect(
        page.locator(`[data-testid=${testId}]`),
        `expected [data-testid=${testId}] to be attached`
      ).toBeAttached({ timeout: 10000 })
    }
  })

  test('Death report renders prevalence-by-gender-age-year trellis chart', async ({ page }) => {
    await goToReport(page, 'death')

    const report = page.getByTestId('death-report')
    await expect(report).toBeVisible({ timeout: 10000 })

    // The trellis chart is the flagship chart-parity addition for the
    // Death report. It may be below the fold, so assert attached rather
    // than visible.
    const trellis = page.locator('[data-testid=prevalence-by-gender-age-year-chart] canvas')
    await expect(trellis).toBeAttached({ timeout: 10000 })
  })
})
