import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'

test.describe('Incidence Rate workbench', () => {
  test.beforeEach(async ({ page }) => {
    await setupBasicMocks(page)
  })

  // Two independent blockers, confirmed by grepping src/components/incidence-rate/:
  // 1. ir-builder-generate, ir-generate-btn, ir-rail-panel-past-runs and
  //    ir-past-run-row are not testids anywhere in the app. The generate
  //    button and run history actually live in the shared
  //    DataSourceRunTable/PreviousRunsDialog components (used identically by
  //    the characterization workbench) under different testids entirely.
  // 2. Even with corrected selectors, generating a real run, polling it to
  //    completion, and exporting its CSV needs a live WebAPI backend --
  //    nothing in tests/e2e/helpers/api-mocks.ts mocks IR generation, run
  //    history or report endpoints. Same root cause already fixme'd in
  //    cohort-generation-inline.spec.ts and pathways-generation.spec.ts.
  test('design → save → generate → past run → switch view → export CSV', async ({ page }) => {
    test.fixme(true, 'Wrong testids for generate/past-run UI, and generation+export need a live WebAPI backend (unmocked)')

    await page.goto('/#/incidence-rates/new')

    await expect(page.getByTestId('ir-builder')).toBeVisible()
    await page.getByTestId('ir-builder-name').fill(`E2E IR ${Date.now()}`)

    await page.getByTestId('ir-rail-panel-targets').click()
    await page
      .getByTestId('ir-rail-panel-targets')
      .getByRole('button', { name: /add/i })
      .click()
    await page.getByRole('listitem').first().click()
    await page.getByRole('button', { name: /add cohort|^add$/i }).click()

    await page.getByTestId('ir-rail-panel-outcomes').click()
    await page
      .getByTestId('ir-rail-panel-outcomes')
      .getByRole('button', { name: /add/i })
      .click()
    await page.getByRole('listitem').first().click()
    await page.getByRole('button', { name: /add cohort|^add$/i }).click()

    await page.getByTestId('ir-builder-save').click()
    await expect(page).toHaveURL(/\/incidence-rates\/\d+$/)

    await page.getByTestId('ir-builder-generate').click()
    await page.getByLabel('Data source').click()
    await page.getByRole('option').first().click()
    await page.getByTestId('ir-generate-btn').click()

    await expect(page.getByTestId('ir-rail-panel-past-runs')).toBeVisible({ timeout: 60000 })
    const firstRun = page.getByTestId('ir-past-run-row').first()
    await firstRun.waitFor({ state: 'visible', timeout: 120000 })
    await firstRun.click()

    await page.getByTestId('ir-toolbar-mode-table').click()
    await expect(page.locator('.ir-rates')).toBeVisible()

    await page.getByTestId('ir-toolbar-mode-treemap').click()
    await expect(page.locator('.ir-rates')).toBeHidden()
    await expect(page.locator('svg.treemap')).toBeVisible()

    await page.getByTestId('ir-toolbar-export').click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('listitem').filter({ hasText: /^CSV$/ }).click(),
    ])
    expect(download.suggestedFilename()).toContain('incidence-rate-')
  })
})
