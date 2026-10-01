/**
 * E2E: Cohort print-friendly export
 *
 * Verifies the legacy WebAPI renderer is reachable from Atlas3's cohort
 * export menu and that its HTML response is presented in the preview dialog.
 */
import { test, expect } from '@playwright/test'
import { setupBasicMocks } from './helpers/api-mocks'
import { waitForNetworkIdle } from './helpers/wait-utils'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const FIXTURES_DIR = path.join(__dirname, '../integration/fixtures/atlas-cohorts')
const loadedCohort = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'cohort-001-simple.json'), 'utf-8')
)

const PRINT_FRIENDLY_HTML = '<h1>Test Cohort</h1><p>Readable cohort criteria</p>'

test.describe('Cohort print-friendly export', () => {
  let printFriendlyExpression: Record<string, unknown> | null

  test.beforeEach(async ({ page }) => {
    printFriendlyExpression = null
    await setupBasicMocks(page)

    await page.route('**/WebAPI/cohortdefinition/1', async route => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          name: 'Test Cohort',
          description: 'A test cohort for E2E testing',
          expression: JSON.stringify(loadedCohort),
        }),
      })
    })

    await page.route(/\/WebAPI\/cohortdefinition\/printfriendly\/cohort\?format=html$/, async route => {
      printFriendlyExpression = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: PRINT_FRIENDLY_HTML,
      })
    })

    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)
  })

  test('renders the WebAPI print-friendly response for the current cohort', async ({ page }) => {
    await page.click('[data-testid="export-btn"]')
    await page.click('[data-testid="view-print-friendly"]')

    const dialog = page.locator('[data-testid="cohort-print-friendly-dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Test Cohort')
    await expect(dialog).toContainText('Readable cohort criteria')

    expect(printFriendlyExpression).not.toBeNull()
    expect(printFriendlyExpression).toHaveProperty('PrimaryCriteria')
    expect(JSON.stringify(printFriendlyExpression)).toContain('ConditionOccurrence')
  })
})