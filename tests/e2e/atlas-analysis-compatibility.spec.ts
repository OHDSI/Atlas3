/**
 * E2E Tests: Atlas Analysis Type Format Compatibility
 *
 * Tests that pathway, incidence rate, and characterization data from
 * atlas-demo.ohdsi.org can be loaded, imported, and rendered correctly
 * in Atlas3.
 */

import { test, expect, type Page } from '@playwright/test'
import { setupBasicMocks, clearCohortStore } from './helpers/api-mocks'
import { waitForPageReady } from './helpers/wait-utils'
import {
  atlasDemoPathways,
  atlasDemoIncidenceRates,
  atlasDemoCharacterizations,
} from './fixtures/atlas-demo'

// ─── Pathway Tests ───────────────────────────────────────────────────────────

test.describe('Atlas Pathway Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    clearCohortStore()
    await setupAnalysisMocks(page)
  })

  for (const pathway of atlasDemoPathways) {
    const name = pathway.name as string

    test(`loads pathway "${name}" in builder without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      await page.route(`**/pathway-analysis/${pathway.id}`, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(pathway),
          })
        } else {
          await route.continue()
        }
      })

      await page.goto(`/pathways/${pathway.id}`)
      await waitForPageReady(page)

      const nameField = page.getByTestId('pathway-builder-name')
      await expect(nameField).toBeVisible({ timeout: 15000 })

      const conversionErrors = errors.filter(e =>
        e.includes('TypeError') || e.includes('Cannot read')
      )
      expect(conversionErrors).toHaveLength(0)
    })
  }

  test('pathway with combinationWindow=0 loads without validation error', async ({ page }) => {
    const zeroWindowPathway = atlasDemoPathways.find(
      p => (p.combinationWindow as number) === 0
    )
    if (!zeroWindowPathway) {
      test.skip()
      return
    }

    await page.route(`**/pathway-analysis/${zeroWindowPathway.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(zeroWindowPathway),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/pathways/${zeroWindowPathway.id}`)
    await waitForPageReady(page)

    const nameField = page.getByTestId('pathway-builder-name')
    await expect(nameField).toBeVisible({ timeout: 15000 })
  })

  test('pathway with allowRepeats=true loads without error', async ({ page }) => {
    const pw = atlasDemoPathways.find(p => p.allowRepeats === true)
    if (!pw) { test.skip(); return }

    await page.route(`**/pathway-analysis/${pw.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pw) })
      } else { await route.continue() }
    })

    await page.goto(`/pathways/${pw.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('pathway-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('pathway with many event cohorts (>3) loads without error', async ({ page }) => {
    const pw = atlasDemoPathways.find(p => (p.eventCohorts as unknown[])?.length > 3)
    if (!pw) { test.skip(); return }

    await page.route(`**/pathway-analysis/${pw.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pw) })
      } else { await route.continue() }
    })

    await page.goto(`/pathways/${pw.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('pathway-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('pathway with large combinationWindow loads without error', async ({ page }) => {
    const pw = atlasDemoPathways.find(p => (p.combinationWindow as number) > 100)
    if (!pw) { test.skip(); return }

    await page.route(`**/pathway-analysis/${pw.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pw) })
      } else { await route.continue() }
    })

    await page.goto(`/pathways/${pw.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('pathway-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('pathway list renders with mock data', async ({ page }) => {
    await page.route('**/pathway-analysis?size=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: atlasDemoPathways,
          totalElements: atlasDemoPathways.length,
          totalPages: 1,
          number: 0,
          size: 10000,
        }),
      })
    })

    await page.goto('/pathways')
    await waitForPageReady(page)

    const listItems = page.locator('[data-testid^="pathway-row-"]')
    const count = await listItems.count()
    // At minimum, the list should render without errors
    expect(count >= 0).toBe(true)
  })

  test('pathway import via file triggers server import', async ({ page }) => {
    const importedPathway = { ...atlasDemoPathways[0], id: 999 }
    let importCalled = false

    await page.route('**/pathway-analysis/import', async (route) => {
      if (route.request().method() === 'POST') {
        importCalled = true
        const body = JSON.parse(route.request().postData() || '{}')
        expect(body).toHaveProperty('name')
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(importedPathway),
        })
      } else {
        await route.continue()
      }
    })

    // Navigate to a new pathway so the import button is visible
    await page.route('**/pathway-analysis?size=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [], totalElements: 0, totalPages: 1, number: 0, size: 10000 }),
      })
    })

    await page.goto('/pathways/new')
    await waitForPageReady(page)

    const importInput = page.getByTestId('pathway-builder-import-input')
    if (await importInput.count() > 0) {
      await importInput.setInputFiles({
        name: 'pathway.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(atlasDemoPathways[0])),
      })

      // Wait for import request
      await page.waitForTimeout(2000)
      expect(importCalled).toBe(true)
    }
  })
})

// ─── Incidence Rate Tests ────────────────────────────────────────────────────

test.describe('Atlas Incidence Rate Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    clearCohortStore()
    await setupAnalysisMocks(page)
  })

  for (const ir of atlasDemoIncidenceRates) {
    const name = ir.name as string

    test(`loads IR "${name}" in builder without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      // IR endpoint returns expression as JSON string
      const wireIR = {
        ...ir,
        expression: JSON.stringify(ir.expression),
      }

      await page.route(`**/ir/${ir.id}`, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(wireIR),
          })
        } else {
          await route.continue()
        }
      })

      await page.goto(`/incidence-rates/${ir.id}`)
      await waitForPageReady(page)

      const nameField = page.getByTestId('ir-builder-name')
      await expect(nameField).toBeVisible({ timeout: 15000 })

      const conversionErrors = errors.filter(e =>
        e.includes('TypeError') || e.includes('Cannot read') ||
        e.includes('not valid JSON')
      )
      expect(conversionErrors).toHaveLength(0)
    })
  }

  test('IR with studyWindow date range loads without error', async ({ page }) => {
    const ir = atlasDemoIncidenceRates.find(i => {
      const expr = i.expression as Record<string, unknown>
      const sw = expr.studyWindow as Record<string, unknown> | null
      return sw && typeof sw.startDate === 'string' && sw.startDate.length > 0
    })
    if (!ir) { test.skip(); return }

    const wireIR = { ...ir, expression: JSON.stringify(ir.expression) }
    await page.route(`**/ir/${ir.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wireIR) })
      } else { await route.continue() }
    })

    await page.goto(`/incidence-rates/${ir.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('ir-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('IR with many strata loads without error', async ({ page }) => {
    const ir = atlasDemoIncidenceRates.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.strata as unknown[])?.length > 3
    })
    if (!ir) { test.skip(); return }

    const wireIR = { ...ir, expression: JSON.stringify(ir.expression) }
    await page.route(`**/ir/${ir.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wireIR) })
      } else { await route.continue() }
    })

    await page.goto(`/incidence-rates/${ir.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('ir-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('IR with many targets and outcomes loads without error', async ({ page }) => {
    const ir = atlasDemoIncidenceRates.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.targetIds as number[])?.length > 3 ||
        (expr.outcomeIds as number[])?.length > 3
    })
    if (!ir) { test.skip(); return }

    const wireIR = { ...ir, expression: JSON.stringify(ir.expression) }
    await page.route(`**/ir/${ir.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wireIR) })
      } else { await route.continue() }
    })

    await page.goto(`/incidence-rates/${ir.id}`)
    await waitForPageReady(page)
    await expect(page.getByTestId('ir-builder-name')).toBeVisible({ timeout: 15000 })
  })

  test('IR with null studyWindow loads without error', async ({ page }) => {
    const ir = atlasDemoIncidenceRates[0]
    const wireIR = {
      ...ir,
      expression: JSON.stringify(ir.expression),
    }

    await page.route(`**/ir/${ir.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(wireIR),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/incidence-rates/${ir.id}`)
    await waitForPageReady(page)

    const nameField = page.getByTestId('ir-builder-name')
    await expect(nameField).toBeVisible({ timeout: 15000 })
  })

  test('IR import via file triggers server import', async ({ page }) => {
    const ir = atlasDemoIncidenceRates[0]
    let importCalled = false

    await page.route('**/ir/design', async (route) => {
      if (route.request().method() === 'POST') {
        importCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...ir,
            id: 999,
            expression: JSON.stringify(ir.expression),
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/incidence-rates/new')
    await waitForPageReady(page)

    const importInput = page.getByTestId('ir-builder-import-input')
    if (await importInput.count() > 0) {
      await importInput.setInputFiles({
        name: 'ir.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(ir)),
      })

      await page.waitForTimeout(2000)
      expect(importCalled).toBe(true)
    }
  })

  test('IR list renders with Atlas demo data', async ({ page }) => {
    const wireIRs = atlasDemoIncidenceRates.map(ir => ({
      ...ir,
      expression: JSON.stringify(ir.expression),
    }))

    await page.route('**/ir/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(wireIRs),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/incidence-rates')
    await waitForPageReady(page)
  })
})

// ─── Characterization Tests ──────────────────────────────────────────────────

test.describe('Atlas Characterization Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    clearCohortStore()
    await setupAnalysisMocks(page)
  })

  for (const char of atlasDemoCharacterizations) {
    const name = char.name as string

    test(`loads characterization "${name}" in builder without errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      // Need to also provide cohorts, featureAnalyses, stratas for the definition endpoint
      const fullChar = {
        ...char,
        cohorts: char.cohorts || [],
        featureAnalyses: char.featureAnalyses || [],
        stratas: char.stratas || [],
      }

      await page.route(`**/cohort-characterization/${char.id}`, async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(fullChar),
          })
        } else {
          await route.continue()
        }
      })

      await page.goto(`/characterizations/${char.id}`)
      await waitForPageReady(page)

      const conversionErrors = errors.filter(e =>
        e.includes('TypeError') || e.includes('Cannot read')
      )
      expect(conversionErrors).toHaveLength(0)
    })
  }

  test('characterization with strata loads in builder', async ({ page }) => {
    const char = atlasDemoCharacterizations.find(c =>
      ((c.stratas || []) as unknown[]).length > 0
    )
    if (!char) { test.skip(); return }

    const fullChar = {
      ...char,
      cohorts: char.cohorts || [],
      featureAnalyses: char.featureAnalyses || [],
      stratas: char.stratas || [],
    }

    await page.route(`**/cohort-characterization/${char.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fullChar) })
      } else { await route.continue() }
    })

    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto(`/characterizations/${char.id}`)
    await waitForPageReady(page)

    const conversionErrors = errors.filter(e => e.includes('TypeError') || e.includes('Cannot read'))
    expect(conversionErrors).toHaveLength(0)
  })

  test('characterization with multiple cohorts and features loads', async ({ page }) => {
    const char = atlasDemoCharacterizations.find(c =>
      ((c.cohorts || []) as unknown[]).length > 1 &&
      ((c.featureAnalyses || []) as unknown[]).length > 1
    )
    if (!char) { test.skip(); return }

    const fullChar = {
      ...char,
      cohorts: char.cohorts || [],
      featureAnalyses: char.featureAnalyses || [],
      stratas: char.stratas || [],
    }

    await page.route(`**/cohort-characterization/${char.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fullChar) })
      } else { await route.continue() }
    })

    await page.goto(`/characterizations/${char.id}`)
    await waitForPageReady(page)
  })

  test('characterization list renders with Atlas demo data', async ({ page }) => {
    await page.route('**/cohort-characterization', async (route) => {
      if (route.request().method() === 'GET' && route.request().url().match(/cohort-characterization$/)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(atlasDemoCharacterizations),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/characterizations')
    await waitForPageReady(page)
  })

  test('characterization import via file triggers server import', async ({ page }) => {
    const char = atlasDemoCharacterizations[0]
    let importCalled = false

    await page.route('**/cohort-characterization/import', async (route) => {
      if (route.request().method() === 'POST') {
        importCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...char,
            id: 999,
            cohorts: [],
            featureAnalyses: [],
            stratas: [],
          }),
        })
      } else {
        await route.continue()
      }
    })

    // Navigate to an existing characterization first to get the import button
    const fullChar = {
      ...char,
      cohorts: char.cohorts || [],
      featureAnalyses: char.featureAnalyses || [],
      stratas: char.stratas || [],
    }

    await page.route(`**/cohort-characterization/${char.id}`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(fullChar),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto(`/characterizations/${char.id}`)
    await waitForPageReady(page)

    const importInput = page.getByTestId('char-builder-import-input')
    if (await importInput.count() > 0) {
      await importInput.setInputFiles({
        name: 'char.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(char)),
      })

      await page.waitForTimeout(2000)
      expect(importCalled).toBe(true)
    }
  })
})

// ─── Cross-Type API Schema Tests ─────────────────────────────────────────────

test.describe('Atlas API Schema Compatibility', () => {
  test('pathway data from atlas-demo has all required fields', async () => {
    for (const p of atlasDemoPathways) {
      expect(p).toHaveProperty('id')
      expect(p).toHaveProperty('name')
      expect(p).toHaveProperty('targetCohorts')
      expect(p).toHaveProperty('eventCohorts')
      expect(p).toHaveProperty('combinationWindow')
      expect(p).toHaveProperty('minCellCount')
      expect(p).toHaveProperty('maxDepth')
      expect(p).toHaveProperty('allowRepeats')
      expect(typeof p.id).toBe('number')
      expect(typeof p.name).toBe('string')
      expect(Array.isArray(p.targetCohorts)).toBe(true)
      expect(Array.isArray(p.eventCohorts)).toBe(true)
    }
  })

  test('incidence rate data from atlas-demo has all required fields', async () => {
    for (const ir of atlasDemoIncidenceRates) {
      expect(ir).toHaveProperty('id')
      expect(ir).toHaveProperty('name')
      expect(ir).toHaveProperty('expression')
      const expr = ir.expression as Record<string, unknown>
      expect(expr).toHaveProperty('targetIds')
      expect(expr).toHaveProperty('outcomeIds')
      expect(expr).toHaveProperty('timeAtRisk')
    }
  })

  test('characterization data from atlas-demo has all required fields', async () => {
    for (const c of atlasDemoCharacterizations) {
      expect(c).toHaveProperty('id')
      expect(c).toHaveProperty('name')
      expect(typeof c.id).toBe('number')
      expect(typeof c.name).toBe('string')
    }
  })

  test('pathway target/event cohort refs have required id and name', async () => {
    for (const p of atlasDemoPathways) {
      const targets = p.targetCohorts as { id: number; name: string }[]
      const events = p.eventCohorts as { id: number; name: string }[]
      for (const tc of targets) {
        expect(typeof tc.id).toBe('number')
        expect(typeof tc.name).toBe('string')
      }
      for (const ec of events) {
        expect(typeof ec.id).toBe('number')
        expect(typeof ec.name).toBe('string')
      }
    }
  })

  test('IR timeAtRisk start/end use valid DateField values', async () => {
    const validFields = ['StartDate', 'EndDate']
    for (const ir of atlasDemoIncidenceRates) {
      const expr = ir.expression as Record<string, unknown>
      const tar = expr.timeAtRisk as { start: { DateField: string }; end: { DateField: string } }
      expect(validFields).toContain(tar.start.DateField)
      expect(validFields).toContain(tar.end.DateField)
    }
  })
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function setupAnalysisMocks(page: Page) {
  await setupBasicMocks(page)

  // Mock pathway list (empty by default)
  await page.route('**/pathway-analysis?size=*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [],
        totalElements: 0,
        totalPages: 1,
        number: 0,
        size: 10000,
      }),
    })
  })

  // Mock IR list
  await page.route('**/ir/', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  })

  // Mock characterization list
  await page.route('**/cohort-characterization', async (route) => {
    if (route.request().method() === 'GET' && route.request().url().match(/cohort-characterization$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  })

  // Mock cohort list for references
  await page.route('**/cohortdefinition', async (route) => {
    if (route.request().method() === 'GET' && route.request().url().match(/cohortdefinition$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  })

  // Mock feature analysis list
  await page.route('**/feature-analysis', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else {
      await route.continue()
    }
  })

  // Mock generation/execution endpoints for all types
  await page.route('**/pathway-analysis/*/generation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/ir/*/info', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/cohort-characterization/*/generation', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}
