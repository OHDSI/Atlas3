/**
 * PhenotypeLibrary Integration Tests
 *
 * For each phenotype from the OHDSI PhenotypeLibrary repo:
 * 1. Import the cohort JSON via the UI Import dialog
 * 2. Save immediately (no changes) → capture BASELINE expression
 *    (this normalises the raw JSON through the Atlas converter round-trip)
 * 3. Add one inclusion rule, save
 * 4. Remove that inclusion rule, save → capture FINAL expression
 * 5. Compare BASELINE vs FINAL — if they match, the frontend did not
 *    permanently mutate the cohort definition
 *
 * Why save before modifying?
 * The raw phenotype JSON differs structurally from what convertInternalToAtlas
 * produces (key ordering, added defaults like AdditionalCriteria, expressionType
 * at the top level, etc.).  By capturing the baseline AFTER the first save, both
 * sides of the comparison have been through the same normalisation pass, so any
 * remaining delta is a genuine data-corruption bug.
 */

import { test, expect } from '@playwright/test'
import { createRequire } from 'module'
import { setupBasicMocks, clearCohortStore } from '../helpers/api-mocks'
import { waitForPageReady, waitForStableElement } from '../helpers/wait-utils'

const require = createRequire(import.meta.url)
const phenotypeFixtures = require('./fixtures/phenotypes.json') as PhenotypeDefinition[]

interface PhenotypeDefinition {
  cohortId: string
  name: string
  json: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Capture the expression field from a PUT /cohortdefinition/{id} request.
 * Sets up the waitForRequest listener BEFORE the triggering action to avoid
 * race conditions, then returns the resolved request's expression.
 */
async function captureNextSaveExpression(
  page: import('@playwright/test').Page,
  triggerFn: () => Promise<void>,
): Promise<Record<string, unknown>> {
  const putPromise = page.waitForRequest(
    req => req.method() === 'PUT' && /cohortdefinition\/\d+$/.test(req.url()),
    { timeout: 15000 },
  )
  await triggerFn()
  const req = await putPromise
  const body = JSON.parse(req.postData() ?? '{}') as Record<string, unknown>
  // The PUT body is { id, name, expressionType, expression: <atlas-json> }
  return (body.expression ?? body) as Record<string, unknown>
}

/**
 * Recursively sort object keys so JSON.stringify produces a canonical string
 * regardless of insertion order.
 */
function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return '[' + value.map(sortedStringify).join(',') + ']'
  }
  if (value !== null && typeof value === 'object') {
    const sorted = Object.keys(value as object)
      .sort()
      .map(k => `"${k}":${sortedStringify((value as Record<string, unknown>)[k])}`)
    return '{' + sorted.join(',') + '}'
  }
  return JSON.stringify(value)
}

/**
 * Deep-compare two expressions in a key-order-insensitive way and return
 * a list of human-readable differences (empty = equivalent).
 */
function diffExpressions(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): string[] {
  const SKIP = new Set(['id', 'name', 'description', 'createdDate', 'modifiedDate', 'createdBy', 'modifiedBy'])
  const filter = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => !SKIP.has(k)))

  const na = filter(a)
  const nb = filter(b)
  const diffs: string[] = []
  const allKeys = new Set([...Object.keys(na), ...Object.keys(nb)])

  for (const key of allKeys) {
    const av = sortedStringify(na[key])
    const bv = sortedStringify(nb[key])
    if (av !== bv) {
      diffs.push(`"${key}" changed`)
    }
  }
  return diffs
}

// ============================================================================
// Fixtures
// ============================================================================

const phenotypes = phenotypeFixtures

// ============================================================================
// Test suite
// ============================================================================

test.describe('PhenotypeLibrary Integration Tests', () => {
  if (phenotypes.length === 0) {
    test('skip — no phenotype fixtures', () => {
      test.skip(true, 'No phenotype fixtures found. Run the GHA workflow (or clone PhenotypeLibrary locally and run the generate script) to populate tests/e2e/phenotype-library/fixtures/phenotypes.json')
    })
  }

  for (const phenotype of phenotypes) {
    test(`[${phenotype.cohortId}] ${phenotype.name}`, async ({ page, browserName }) => {
      test.skip(
        browserName !== 'chromium',
        'Phenotype integration tests run on Chromium only',
      )

      // ── Setup ─────────────────────────────────────────────────────────
      clearCohortStore()
      await setupBasicMocks(page)

      // ── Step 1: Navigate to cohorts list and open Import dialog ───────
      await page.goto('/cohorts')
      await waitForPageReady(page)

      await page.locator('[data-testid="import-cohort-btn"]').click()

      // Wait for the textarea to be visible AND for the dialog's entry
      // animation to finish — Vuetify animates dialogs open, and the textarea
      // stays non-editable until the animation settles.
      const jsonTextarea = page.locator('[data-testid="import-json-field"] textarea').first()
      await waitForStableElement(jsonTextarea, 15000)
      await expect(jsonTextarea).toBeEditable({ timeout: 15000 })

      // ── Step 2: Fill import form and submit ───────────────────────────
      await page.locator('[data-testid="import-name-field"] input').fill(phenotype.name)
      await jsonTextarea.fill(phenotype.json, { timeout: 30000 })

      await page.locator('[data-testid="import-confirm-btn"]').click()

      // ── Step 3: Wait for builder to load ──────────────────────────────
      await page.waitForURL(/\/cohorts\/\d+/, { timeout: 30000 })
      await waitForPageReady(page)
      // The cohort builder may or may not issue a GET /cohortdefinition/{id}
      // (if the POST response data was stored in Pinia, no GET is made).
      // Waiting for the save button is a more reliable signal that the
      // builder has fully loaded the cohort.
      await waitForPageReady(page)
      // Skip cohorts with no entry events — the Save button is disabled
      const saveBtn = page.locator('[data-testid="save-cohort-btn"]')
      await expect(saveBtn).toBeVisible({ timeout: 15000 })
      const isSaveEnabled = await saveBtn.isEnabled().catch(() => false)
      if (!isSaveEnabled) {
        test.skip(true, `Cohort "${phenotype.name}" has no entry events; skipping`)
        return
      }

      // ── Step 4: Save immediately → capture BASELINE (normalised) ─────
      // This first save passes the raw phenotype JSON through the Atlas
      // converter round-trip, establishing a stable baseline.
      const baselineExpression = await captureNextSaveExpression(page, async () => {
        await page.locator('[data-testid="save-cohort-btn"]').click()
      })

      // ── Step 5: Add one inclusion rule ────────────────────────────────
      const addRuleBtn = page.locator('[data-testid="add-inclusion-rule"]')
      await expect(addRuleBtn).toBeVisible({ timeout: 10000 })
      const originalRuleCount = await page.locator('[data-testid="remove-inclusion-rule"]').count()

      await addRuleBtn.click()
      await expect(page.locator('[data-testid="remove-inclusion-rule"]')).toHaveCount(
        originalRuleCount + 1,
        { timeout: 5000 },
      )

      // ── Step 6: Save with the extra rule ──────────────────────────────
      await captureNextSaveExpression(page, async () => {
        await page.locator('[data-testid="save-cohort-btn"]').click()
      })

      // ── Step 7: Remove the inclusion rule we just added ───────────────
      // addNewRule() prepends the new rule at index 0, so .first() targets it
      await page.locator('[data-testid="remove-inclusion-rule"]').first().click()
      await expect(page.locator('[data-testid="remove-inclusion-rule"]')).toHaveCount(
        originalRuleCount,
        { timeout: 5000 },
      )

      // ── Step 8: Save again → capture FINAL expression ─────────────────
      const finalExpression = await captureNextSaveExpression(page, async () => {
        await page.locator('[data-testid="save-cohort-btn"]').click()
      })

      // ── Step 9: Compare BASELINE vs FINAL ────────────────────────────
      const diffs = diffExpressions(baselineExpression, finalExpression)

      if (diffs.length > 0) {
        console.error(
          `[${phenotype.cohortId}] "${phenotype.name}" — ${diffs.length} mutation(s) detected:\n` +
            diffs.map(d => `  • ${d}`).join('\n'),
        )
      }

      expect(diffs, `Cohort "${phenotype.name}" was mutated by the add→save→remove→save cycle`).toHaveLength(0)
    })
  }
})
