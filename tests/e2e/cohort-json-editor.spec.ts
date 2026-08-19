/**
 * E2E: Cohort JSON editor (View / Edit → overwrite from JSON)
 *
 * Drives the real builder: open the JSON dialog from the export menu,
 * overwrite the cohort's Atlas expression with a different one, apply it,
 * and confirm the change reaches both the visual builder and the save
 * payload — while the cohort's name and description survive untouched.
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

// Loaded cohort: a Type 2 Diabetes condition-occurrence entry event.
const loadedCohort = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'cohort-001-simple.json'), 'utf-8')
)
// Pasted over it: a Coronary Artery Bypass procedure-occurrence entry event.
const replacementCohort = JSON.parse(
  fs.readFileSync(path.join(FIXTURES_DIR, 'cohort-015-procedure-entry.json'), 'utf-8')
)

const JSON_FIELD = '[data-testid="cohort-json-field"] textarea'

async function openJsonDialog(page: import('@playwright/test').Page) {
  await page.click('[data-testid="export-btn"]')
  await page.click('[data-testid="view-json"]')
  await expect(page.locator(JSON_FIELD)).toBeVisible()
}

test.describe('Cohort JSON editor', () => {
  test.beforeEach(async ({ page }) => {
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
          // WebAPI serialises `expression` as a JSON string; normalizeRawCohortDefinition
          // JSON.parses it, so the mock has to match the wire shape, not the parsed shape.
          expression: JSON.stringify(loadedCohort),
        }),
      })
    })

    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)
  })

  test('shows the current cohort expression as JSON', async ({ page }) => {
    await openJsonDialog(page)

    const json = await page.locator(JSON_FIELD).inputValue()
    const parsed = JSON.parse(json)

    expect(parsed.PrimaryCriteria.CriteriaList[0]).toHaveProperty('ConditionOccurrence')
    expect(parsed.ConceptSets[0].name).toBe('Type 2 Diabetes')
  })

  test('rejects malformed JSON instead of applying it', async ({ page }) => {
    await openJsonDialog(page)

    await page.fill(JSON_FIELD, '{ "PrimaryCriteria": ')

    await expect(page.locator('[data-testid="cohort-json-error"]')).toContainText('Invalid JSON')
    await expect(page.locator('[data-testid="cohort-json-apply"]')).toBeDisabled()
  })

  test('overwrites the cohort expression, keeps the name, and saves the new JSON', async ({
    page,
  }) => {
    let savedExpression: Record<string, unknown> | null = null
    await page.route('**/WebAPI/cohortdefinition/1', async route => {
      if (route.request().method() !== 'PUT') {
        await route.continue()
        return
      }
      const body = JSON.parse(route.request().postData() || '{}')
      savedExpression = body.expression
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...body, id: 1 }),
      })
    })

    await openJsonDialog(page)

    // Overwrite the editor with a completely different cohort expression.
    await page.fill(JSON_FIELD, JSON.stringify(replacementCohort, null, 2))
    await page.click('[data-testid="cohort-json-apply"]')

    // Dialog closes on apply.
    await expect(page.locator(JSON_FIELD)).toBeHidden()

    // The visual builder now shows the pasted cohort's concept set...
    await expect(page.getByText('Coronary Artery Bypass').first()).toBeVisible()
    // ...and the cohort's identity survived the overwrite.
    await expect(page.locator('.cohort-builder-view__title-input')).toHaveValue('Test Cohort')

    // Applying leaves the cohort dirty — it is not auto-saved.
    await expect(page.locator('[data-testid="save-cohort-dirty-dot"]')).toBeVisible()

    // Saving persists the pasted expression, not the originally loaded one.
    await page.click('[data-testid="save-cohort-btn"]')
    await expect.poll(() => savedExpression).not.toBeNull()

    const expression = savedExpression as unknown as Record<string, never>
    expect(expression).toHaveProperty('PrimaryCriteria')
    const criteria = (expression as Record<string, { CriteriaList: unknown[] }>).PrimaryCriteria
    expect(criteria.CriteriaList[0]).toHaveProperty('ProcedureOccurrence')
    expect(JSON.stringify(expression)).not.toContain('ConditionOccurrence')
  })

  test('warns before navigating away from an unsaved JSON edit', async ({ page }) => {
    await openJsonDialog(page)
    await page.fill(JSON_FIELD, JSON.stringify(replacementCohort, null, 2))
    await page.click('[data-testid="cohort-json-apply"]')
    await expect(page.locator(JSON_FIELD)).toBeHidden()

    await page.evaluate(() => {
      window.location.hash = '#/cohorts'
    })

    await expect(page.getByText('Unsaved changes will be lost. Proceed?')).toBeVisible()
    await expect(page).toHaveURL(/#\/cohorts\/1$/)
  })
})
