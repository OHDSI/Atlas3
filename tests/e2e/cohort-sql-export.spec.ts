/**
 * E2E: Cohort SQL export (#321)
 *
 * Drives the real builder: open the SQL dialog from the export menu, confirm
 * the template SQL arrives, and that choosing a dialect sends the template to
 * the translation endpoint and shows what comes back.
 *
 * The unit tests mock the service; this exercises the wiring the unit tests
 * cannot see — menu item to dialog to request body — including that the
 * expression actually posted is the normalised one circe-be accepts.
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

const SQL_FIELD = '[data-testid="cohort-sql-field"] textarea'
const TEMPLATE_SQL = 'SELECT * FROM @cdm_database_schema.person WHERE 1 = 1'
const TRANSLATED_SQL = 'SELECT * FROM cdm.person WHERE 1 = 1'

test.describe('Cohort SQL export', () => {
  let sqlRequestBody: Record<string, unknown> | null
  let translateRequestBody: Record<string, unknown> | null

  test.beforeEach(async ({ page }) => {
    sqlRequestBody = null
    translateRequestBody = null

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

    await page.route('**/WebAPI/cohortdefinition/sql', async route => {
      sqlRequestBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ templateSql: TEMPLATE_SQL }),
      })
    })

    await page.route('**/WebAPI/sqlrender/translate', async route => {
      translateRequestBody = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ targetSQL: TRANSLATED_SQL }),
      })
    })

    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)
  })

  async function openSqlDialog(page: import('@playwright/test').Page) {
    await page.click('[data-testid="export-btn"]')
    await page.click('[data-testid="view-sql"]')
    await expect(page.locator(SQL_FIELD)).toBeVisible()
  }

  test('shows the template SQL, built from the current expression', async ({ page }) => {
    await openSqlDialog(page)

    await expect(page.locator(SQL_FIELD)).toHaveValue(TEMPLATE_SQL)

    // The expression posted is the cohort being edited, not an empty shell.
    expect(sqlRequestBody).not.toBeNull()
    const expression = (sqlRequestBody as Record<string, Record<string, unknown>>).expression
    expect(expression).toHaveProperty('PrimaryCriteria')
    expect(JSON.stringify(expression)).toContain('ConditionOccurrence')
  })

  test('translates to the chosen dialect', async ({ page }) => {
    await openSqlDialog(page)

    // Vuetify overlays the native input, so click the field itself.
    await page.locator('[data-testid="cohort-sql-dialect"] .v-field__input').click()
    await page.getByRole('option', { name: 'PostgreSQL', exact: true }).click()

    await expect(page.locator(SQL_FIELD)).toHaveValue(TRANSLATED_SQL)
    expect(translateRequestBody).toMatchObject({
      sql: TEMPLATE_SQL,
      targetDialect: 'postgresql',
    })
  })

  test('surfaces the server message when the SQL cannot be built', async ({ page }) => {
    await page.route('**/WebAPI/cohortdefinition/sql', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Cannot invoke getCriteriaList()' }),
      })
    })

    await page.click('[data-testid="export-btn"]')
    await page.click('[data-testid="view-sql"]')

    await expect(page.locator('[data-testid="cohort-sql-error"]')).toContainText(
      'Cannot invoke getCriteriaList()'
    )
  })
})
