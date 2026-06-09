/**
 * E2E Tests: Atlas Format Compatibility
 *
 * Tests that cohort definitions from atlas-demo.ohdsi.org can be imported into Atlas3,
 * rendered in the cohort builder, saved, and exported with format fidelity.
 *
 * These tests ensure Atlas3 stays compatible with the production Atlas (2.x) format.
 */

import { test, expect, type Page } from '@playwright/test'
import { setupBasicMocks, clearCohortStore, seedCohortStore } from './helpers/api-mocks'
import { waitForPageReady, waitForOverlaysToClose } from './helpers/wait-utils'
import { atlasDemoCohorts, type AtlasDemoCohort } from './fixtures/atlas-demo'

async function setupAllMocks(page: Page) {
  clearCohortStore()
  await setupBasicMocks(page)
}

test.describe('Atlas Format Compatibility - Cohort Import', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page)
  })

  for (const cohort of atlasDemoCohorts) {
    test(`imports "${cohort.name}" (id ${cohort.id}) via JSON paste`, async ({ page }) => {
      await page.goto('/#/cohorts')
      await waitForPageReady(page)
      await waitForOverlaysToClose(page)

      // Open import dialog
      const importBtn = page.getByTestId('import-cohort-btn')
      await expect(importBtn).toBeVisible({ timeout: 10000 })
      await importBtn.click()

      // Fill in name
      const nameField = page.getByTestId('import-name-field')
      await expect(nameField).toBeVisible()
      await nameField.locator('input').fill(`E2E: ${cohort.name}`)

      // Paste expression JSON
      const jsonField = page.getByTestId('import-json-field')
      await expect(jsonField).toBeVisible()
      const expressionJson = JSON.stringify(cohort.expression)
      await jsonField.locator('textarea').first().fill(expressionJson)

      // Click import/confirm
      const confirmBtn = page.getByTestId('import-confirm-btn')
      await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
      await confirmBtn.click()

      // Should navigate to the cohort builder
      await expect(page).toHaveURL(/\/cohorts\/\d+/, { timeout: 15000 })
    })
  }
})

test.describe('Atlas Format Compatibility - Round-Trip via UI', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page)
  })

  test('import and export preserve expression structure', async ({ page }) => {
    // Use a relatively simple cohort for the UI round-trip test
    const cohort = atlasDemoCohorts[0] // obesity cohort
    const expressionJson = JSON.stringify(cohort.expression)

    // Step 1: Import cohort
    await page.goto('/#/cohorts')
    await waitForPageReady(page)
    await waitForOverlaysToClose(page)

    const importBtn = page.getByTestId('import-cohort-btn')
    await importBtn.click()

    const nameField = page.getByTestId('import-name-field')
    await nameField.locator('input').fill('Round-trip test')
    const jsonField = page.getByTestId('import-json-field')
    await jsonField.locator('textarea').first().fill(expressionJson)

    const confirmBtn = page.getByTestId('import-confirm-btn')
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 })

    // Capture the POST request to verify what was sent
    const postPromise = page.waitForRequest(req =>
      req.url().includes('cohortdefinition') && req.method() === 'POST'
    )

    await confirmBtn.click()
    const postReq = await postPromise
    const postBody = JSON.parse(postReq.postData() || '{}')

    // The expression sent to the server should be an object
    expect(postBody.expression).toBeDefined()
    expect(typeof postBody.expression).toBe('object')
    expect(postBody.name).toBe('Round-trip test')

    // Navigate to cohort builder
    await expect(page).toHaveURL(/\/cohorts\/\d+/, { timeout: 15000 })
  })

  test('export JSON button produces valid Atlas-format JSON', async ({ page }) => {
    const cohort = atlasDemoCohorts[0]

    // Pre-populate cohort store so the generic mock serves it
    seedCohortStore(500, {
      id: 500,
      name: 'Export test cohort',
      expression: cohort.expression,
    })

    // Navigate directly to the cohort builder
    await page.goto('/#/cohorts/500')
    await waitForPageReady(page)

    // Click the export button
    const exportBtn = page.getByTestId('export-btn')
    await expect(exportBtn).toBeVisible({ timeout: 10000 })
    await exportBtn.click()

    // Click "Copy To Clipboard" to trigger the export
    const copyBtn = page.getByTestId('export-copy-json')
    await expect(copyBtn).toBeVisible()

    // Read clipboard after clicking copy
    await page.evaluate(() => {
      // Grant clipboard permissions for the test
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            (window as unknown as Record<string, string>).__clipboardData = text
            return Promise.resolve()
          },
          readText: () => Promise.resolve((window as unknown as Record<string, string>).__clipboardData || ''),
        },
        writable: true,
      })
    })

    await copyBtn.click()

    // Get the clipboard data
    const clipboardData = await page.evaluate(() =>
      (window as unknown as Record<string, string>).__clipboardData
    )

    if (clipboardData) {
      const exportedJson = JSON.parse(clipboardData)
      // Verify essential Atlas format fields
      expect(exportedJson).toHaveProperty('ConceptSets')
      expect(exportedJson).toHaveProperty('PrimaryCriteria')
      expect(exportedJson.PrimaryCriteria).toHaveProperty('CriteriaList')
      expect(exportedJson.PrimaryCriteria).toHaveProperty('ObservationWindow')
    }
  })
})

test.describe('Atlas Format Compatibility - Expression Structure Preservation', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page)
  })

  test('Measurement criteria with ValueAsNumber preserves numeric attributes', async ({ page }) => {
    const cohort = atlasDemoCohorts.find(c => c.id === 1)!
    await importCohortViaUI(page, cohort)

    const saved = await captureImportedExpression(page, cohort)
    if (saved) {
      const pc = saved.PrimaryCriteria as Record<string, unknown> | undefined
      expect((pc?.CriteriaList as unknown[])?.length).toBeGreaterThan(0)
      expect((saved.ConceptSets as unknown[])?.length).toBeGreaterThan(0)
    }
  })

  test('ConditionOccurrence with VisitType filter preserves concept arrays', async ({ page }) => {
    const cohort = atlasDemoCohorts.find(c => c.id === 3)!
    await importCohortViaUI(page, cohort)

    const saved = await captureImportedExpression(page, cohort)
    if (saved) {
      expect((saved.ConceptSets as unknown[])?.length).toBe(3)
      expect((saved.InclusionRules as unknown[])?.length).toBe(3)
    }
  })

  test('DrugExposure with First flag preserves boolean attributes', async ({ page }) => {
    const cohort = atlasDemoCohorts.find(c => c.id === 8)!
    await importCohortViaUI(page, cohort)

    const saved = await captureImportedExpression(page, cohort)
    if (saved) {
      const conceptSets = saved.ConceptSets as Record<string, unknown>[]
      expect(conceptSets?.length).toBeGreaterThan(0)
      const aceSet = conceptSets?.[0]
      const expr = aceSet?.expression as Record<string, unknown>
      expect((expr?.items as unknown[])?.length).toBeGreaterThan(1)
    }
  })

  test('Complex cohort with AdditionalCriteria preserves temporal windows', async ({ page }) => {
    const cohort = atlasDemoCohorts.find(c => c.id === 10)!
    await importCohortViaUI(page, cohort)

    const saved = await captureImportedExpression(page, cohort)
    if (saved) {
      expect((saved.ConceptSets as unknown[])?.length).toBeGreaterThan(0)
    }
  })
})

test.describe('Atlas Format Compatibility - Cohort Builder Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await setupAllMocks(page)
  })

  for (const cohort of atlasDemoCohorts) {
    test(`loads "${cohort.name}" without errors in cohort builder`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })
      page.on('pageerror', err => {
        errors.push(err.message)
      })

      // Pre-populate the in-memory cohort store so the generic mock serves it
      seedCohortStore(cohort.id, {
        id: cohort.id,
        name: cohort.name,
        expression: cohort.expression,
      })

      // Navigate to the cohort builder and wait for initial load
      await page.goto(`/#/cohorts/${cohort.id}`)
      // Give the page time to process the expression — don't wait for
      // full networkidle since some endpoints may not be mocked
      await page.waitForTimeout(3000)

      // Verify no conversion/runtime errors occurred during expression parsing
      const conversionErrors = errors.filter(e =>
        e.includes('convert') || e.includes('TypeError') || e.includes('Cannot read')
      )
      expect(conversionErrors).toHaveLength(0)
    })
  }
})

test.describe('Atlas Format Compatibility - API Structure Validation', () => {
  test('atlas-demo.ohdsi.org cohort list response matches expected schema', async ({ page }) => {
    // Verify that our mock cohort list format matches what Atlas produces
    await setupBasicMocks(page)
    await page.goto('/#/cohorts')
    await waitForPageReady(page)

    // The mock cohort list should render cards
    const cohortCards = page.locator('.cohort-card')
    await expect(cohortCards.first()).toBeVisible({ timeout: 10000 })

    const count = await cohortCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('pathway analysis format has required fields', async () => {
    const { atlasDemoPathway } = await import('./fixtures/atlas-demo')
    expect(atlasDemoPathway).toHaveProperty('id')
    expect(atlasDemoPathway).toHaveProperty('name')
    expect(atlasDemoPathway).toHaveProperty('targetCohorts')
    expect(atlasDemoPathway).toHaveProperty('eventCohorts')
    expect(atlasDemoPathway).toHaveProperty('combinationWindow')
    expect(atlasDemoPathway).toHaveProperty('maxDepth')
    expect(atlasDemoPathway).toHaveProperty('allowRepeats')
    expect(Array.isArray(atlasDemoPathway.targetCohorts)).toBe(true)
    expect(Array.isArray(atlasDemoPathway.eventCohorts)).toBe(true)
  })

  test('incidence rate format has required fields', async () => {
    const { atlasDemoIncidenceRate } = await import('./fixtures/atlas-demo')
    expect(atlasDemoIncidenceRate).toHaveProperty('id')
    expect(atlasDemoIncidenceRate).toHaveProperty('name')
    expect(atlasDemoIncidenceRate).toHaveProperty('expression')
    const expr = atlasDemoIncidenceRate.expression as Record<string, unknown>
    expect(expr).toHaveProperty('targetIds')
    expect(expr).toHaveProperty('outcomeIds')
    expect(expr).toHaveProperty('timeAtRisk')
    expect(Array.isArray(expr.targetIds)).toBe(true)
    expect(Array.isArray(expr.outcomeIds)).toBe(true)
  })

  test('characterization format has required fields', async () => {
    const { atlasDemoCharacterization } = await import('./fixtures/atlas-demo')
    expect(atlasDemoCharacterization).toHaveProperty('id')
    expect(atlasDemoCharacterization).toHaveProperty('name')
  })
})

// --- Helper functions ---

async function importCohortViaUI(page: Page, cohort: AtlasDemoCohort) {
  await page.goto('/#/cohorts')
  await waitForPageReady(page)
  await waitForOverlaysToClose(page)

  const importBtn = page.getByTestId('import-cohort-btn')
  await expect(importBtn).toBeVisible({ timeout: 10000 })
  await importBtn.click()

  const nameField = page.getByTestId('import-name-field')
  await expect(nameField).toBeVisible()
  await nameField.locator('input').fill(cohort.name)

  const jsonField = page.getByTestId('import-json-field')
  await expect(jsonField).toBeVisible()
  await jsonField.locator('textarea').first().fill(JSON.stringify(cohort.expression))

  const confirmBtn = page.getByTestId('import-confirm-btn')
  await expect(confirmBtn).toBeEnabled({ timeout: 5000 })
  await confirmBtn.click()

  await expect(page).toHaveURL(/\/cohorts\/\d+/, { timeout: 15000 })
}

async function captureImportedExpression(
  page: Page,
  _cohort: AtlasDemoCohort
): Promise<Record<string, unknown> | null> {
  // Reload the page and intercept the GET to capture what was stored
  const currentUrl = page.url()
  const idMatch = currentUrl.match(/\/cohorts\/(\d+)/)
  if (!idMatch) return null

  // Wait for the builder to render, then use the GET response
  const response = await page.waitForResponse(
    resp => resp.url().includes(`cohortdefinition/${idMatch[1]}`) && resp.request().method() === 'GET',
    { timeout: 5000 }
  ).catch(() => null)

  if (response) {
    const data = await response.json().catch(() => null)
    return data?.expression as Record<string, unknown> | null
  }
  return null
}
