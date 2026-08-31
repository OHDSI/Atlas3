/**
 * PhenotypeLibrary Integration Tests
 *
 * For each phenotype from the OHDSI PhenotypeLibrary repo:
 * 1. Import the cohort JSON via the UI Import dialog
 * 2. Save immediately (no changes) → capture BASELINE expression
 * 3. Compare IMPORTED vs BASELINE — fidelity check: did import+save
 *    preserve every field of the original phenotype definition?
 * 4. Add one inclusion rule, save
 * 5. Remove that inclusion rule, save → capture FINAL expression
 * 6. Compare BASELINE vs FINAL — idempotence check: did the no-op
 *    add/remove cycle leave the cohort untouched?
 *
 * Sampling is controlled by PHENOTYPE_SAMPLE_SIZE (default 10) and
 * PHENOTYPE_SAMPLE_SEED (default time-based). Set SAMPLE_SIZE=all to
 * run every fixture.
 */

import { test, expect } from '@playwright/test'
import { createRequire } from 'module'
import { setupBasicMocks, clearCohortStore } from '../helpers/api-mocks'
import { waitForPageReady, waitForStableElement } from '../helpers/wait-utils'

const require = createRequire(import.meta.url)
const phenotypeFixtures = require('./fixtures/phenotypes.json') as PhenotypeDefinition[]

/** Chosen to select the four multi-megabyte outliers, well clear of the next largest at ~750KB. */
const LARGE_DESIGN_BYTES = 1_000_000

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
  // Top-level keys ignored by the round-trip diff:
  //  - id/name/description/audit fields: wrapper metadata, not part of the
  //    cohort expression
  //  - expressionType: serialiser injects "SIMPLE_EXPRESSION" when the source
  //    omits it; semantically equivalent to absent
  //  - AdditionalCriteria: serialiser injects an empty group object
  //    ({CriteriaList:[],DemographicCriteriaList:[],Groups:[],Type:"ALL"}) when
  //    the source omits it; semantically equivalent to absent
  const SKIP = new Set([
    'id',
    'name',
    'description',
    'createdDate',
    'modifiedDate',
    'createdBy',
    'modifiedBy',
    'expressionType',
    'AdditionalCriteria',
  ])
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

function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function samplePhenotypes(all: PhenotypeDefinition[]): PhenotypeDefinition[] {
  const rawSize = (process.env.PHENOTYPE_SAMPLE_SIZE ?? '10').trim()
  // 0 means every phenotype, the same reading the fixture generator in
  // .github/workflows/phenotype-integration.yml uses. Taking it as "sample
  // none" instead left the workflow running zero tests and passing.
  if (rawSize === 'all' || rawSize === '0') return all
  const size = Math.max(0, Math.min(all.length, parseInt(rawSize, 10) || 0))
  if (size >= all.length) return all
  const seed = parseInt(process.env.PHENOTYPE_SAMPLE_SEED ?? '', 10) || Date.now() % 0xffffffff
  const rand = mulberry32(seed)
  const indices = all.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const picked = indices.slice(0, size).map(i => all[i])
  console.log(
    `[phenotype-integration] sampled ${picked.length}/${all.length} fixtures ` +
      `(seed=${seed}): ${picked.map(p => p.cohortId).join(', ')}`,
  )
  return picked
}

const phenotypes = samplePhenotypes(phenotypeFixtures)

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

      // A handful of designs are enormous next to the rest: the four largest are
      // ~3.7MB of JSON against a median of 2.3KB across all 1104 fixtures. Filling
      // the textarea, importing and diffing that much JSON takes over a minute at
      // the four workers per shard this suite runs with, so they sat on the 60s
      // limit and tipped over it whenever the runner was loaded, failing CI on
      // unrelated changes. slow() triples the budget for just these, rather than
      // loosening the limit for the 1100 designs that finish in about five seconds.
      // A handful of designs are enormous next to the rest: the four largest are
      // ~3.7MB of JSON against a median of 2.3KB across all 1104 fixtures. The
      // builder takes tens of seconds to render and settle one of those, which
      // overruns both the per-test budget and the per-action waits below. Give
      // them room rather than loosening the limits for the 1100 designs that
      // finish in about five seconds and should still fail fast.
      const isLargeDesign = phenotype.json.length > LARGE_DESIGN_BYTES
      const settleTimeout = isLargeDesign ? 60000 : 15000
      if (isLargeDesign) {
        // All four land in the same shard and run concurrently at the four
        // workers this suite uses, so they compete for the same two cores with
        // roughly 15MB of DOM between them. Importing, saving, diffing, adding
        // a rule and saving again takes minutes in that state. slow() triples
        // the budget to 180s, which is still not enough; this is the observed
        // worst case with headroom, and it applies to four tests out of 1104.
        test.setTimeout(300000)
      }

      // ── Setup ─────────────────────────────────────────────────────────
      clearCohortStore()
      await setupBasicMocks(page)

      // ── Step 1: Navigate to cohorts list and open Import dialog ───────
      await page.goto('/#/cohorts')
      await waitForPageReady(page)

      await page.locator('[data-testid="import-cohort-btn"]').click()

      // Wait for the textarea to be visible AND for the dialog's entry
      // animation to finish — Vuetify animates dialogs open, and the textarea
      // stays non-editable until the animation settles.
      const jsonTextarea = page.locator('[data-testid="import-json-field"] textarea').first()
      await waitForStableElement(jsonTextarea, settleTimeout)
      await expect(jsonTextarea).toBeEditable({ timeout: 15000 })

      // ── Step 2: Fill import form and submit ───────────────────────────
      await page.locator('[data-testid="import-name-field"] input').fill(phenotype.name)
      // Vuetify's v-textarea flakes through Playwright's fill() actionability
      // re-checks for very large JSON payloads — set the value directly via
      // the DOM and dispatch input so v-model picks it up.
      await jsonTextarea.evaluate((el, value) => {
        const setter = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          'value',
        )?.set
        setter?.call(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
      }, phenotype.json)

      await page.locator('[data-testid="import-confirm-btn"]').click()

      // ── Step 3: Wait for builder to load ──────────────────────────────
      await page.waitForURL(/\/cohorts\/\d+/, { timeout: 30000 })
      // Skip cohorts with no entry events — the Save button is disabled
      const saveBtn = page.locator('[data-testid="save-cohort-btn"]')
      // The cohort builder may or may not issue a GET /cohortdefinition/{id}
      // (if the POST response data was stored in Pinia, no GET is made).
      // Waiting for the save button is a more reliable signal that the
      // builder has fully loaded the cohort.
      if (isLargeDesign) {
        // The builder is compute bound for a design this size rather than
        // animating: the main thread is saturated rendering thousands of
        // criteria, so the animation settle step cannot get a turn and times
        // out however long it is given. Visibility plus the enabled check
        // below is the readiness signal that actually matters here.
        await saveBtn.waitFor({ state: 'visible', timeout: settleTimeout })
      } else {
        await waitForStableElement(saveBtn, settleTimeout)
      }
      await expect(saveBtn).toBeVisible({ timeout: settleTimeout })
      const isSaveEnabled = await saveBtn.isEnabled().catch(() => false)
      if (!isSaveEnabled) {
        test.skip(true, `Cohort "${phenotype.name}" has no entry events; skipping`)
        return
      }

      // ── Step 4: Save immediately → capture BASELINE ──────────────────
      const baselineExpression = await captureNextSaveExpression(page, async () => {
        await page.locator('[data-testid="save-cohort-btn"]').click()
      })

      // ── Step 4a: Compare imported JSON vs BASELINE (fidelity check) ──
      const importedExpression = JSON.parse(phenotype.json) as Record<string, unknown>
      const importDiffs = diffExpressions(importedExpression, baselineExpression)
      if (importDiffs.length > 0) {
        console.error(
          `[${phenotype.cohortId}] "${phenotype.name}" — import mutated ${importDiffs.length} field(s):\n` +
            importDiffs.map(d => `  • ${d}`).join('\n'),
        )
      }
      expect(
        importDiffs,
        `Import + save mutated cohort "${phenotype.name}" relative to original JSON`,
      ).toHaveLength(0)

      // ── Step 5: Add one inclusion rule ────────────────────────────────
      // The panel shows a standalone empty-state button until the first rule
      // exists and the rail's own button after that.
      const ruleItems = page.locator('[data-testid="inclusion-rail-rule"]')
      const originalRuleCount = await ruleItems.count()
      const addRuleBtn =
        originalRuleCount === 0
          ? page.locator('[data-testid="inclusion-empty-add"]')
          : page.locator('[data-testid="inclusion-rail-add"]')
      await expect(addRuleBtn).toBeVisible({ timeout: 10000 })

      await addRuleBtn.click()
      await expect(ruleItems).toHaveCount(originalRuleCount + 1, { timeout: 5000 })

      // ── Step 6: Save with the extra rule ──────────────────────────────
      await captureNextSaveExpression(page, async () => {
        await page.locator('[data-testid="save-cohort-btn"]').click()
      })

      // ── Step 7: Remove the inclusion rule we just added ───────────────
      // addNewRule() appends the rule and selects it, so the detail pane is
      // already showing the new one and its delete button acts on that
      // selection.
      await page.locator('[data-testid="inclusion-detail-remove"]').click()
      await expect(ruleItems).toHaveCount(originalRuleCount, { timeout: 5000 })

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
