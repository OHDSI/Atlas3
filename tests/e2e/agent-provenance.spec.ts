/**
 * E2E: AI agent history (MCP provenance) on the cohort builder
 *
 * WebAPI's MCP server records every tool call an agent makes against a cohort
 * definition, with the clinical rationale it was required to give
 * (OHDSI/WebAPI#2580). This drives the real builder: the toolbar shows the
 * history button only when there is history, and the dialog lists the calls.
 */

import { test, expect, type Page } from '@playwright/test'
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

const TRACE_ID = '4bf92f3577b34da6a3ce929d0e0e4736'
const RATIONALE = 'Adults aged 40+ at their first recorded gastrointestinal hemorrhage.'

const PROVENANCE = [
  {
    id: 11,
    traceId: TRACE_ID,
    spanId: '00f067aa0ba902b7',
    parentSpanId: 'aaaaaaaaaaaaaaaa',
    reasoningStep: 'STEP_3_COHORT_CRITERIA_DEFINITION',
    tool: 'create_cohort_definition',
    outcome: 'SUCCESS',
    clinicalRationale: RATIONALE,
    evidenceReference: 'OHDSI Eunomia GiBleed example study',
    errorMessage: null,
    userLogin: 'analyst',
    startedAt: Date.UTC(2026, 10, 4, 9, 0, 0),
    finishedAt: Date.UTC(2026, 10, 4, 9, 0, 1),
  },
  {
    id: 12,
    traceId: TRACE_ID,
    spanId: '00f067aa0ba902b8',
    parentSpanId: 'bbbbbbbbbbbbbbbb',
    reasoningStep: 'STEP_3_COHORT_CRITERIA_DEFINITION',
    tool: 'update_cohort_definition',
    outcome: 'REJECTED',
    clinicalRationale: 'Narrow the entry event to upper GI bleeding.',
    evidenceReference: 'SNOMED-CT clinical finding hierarchy',
    errorMessage: 'Concept 192671 is named "Gastrointestinal hemorrhage" in the vocabulary, not "Upper GI bleed"; nothing was saved.',
    userLogin: 'analyst',
    startedAt: Date.UTC(2026, 10, 4, 9, 1, 0),
    finishedAt: Date.UTC(2026, 10, 4, 9, 1, 0),
  },
  {
    id: 13,
    traceId: TRACE_ID,
    spanId: '00f067aa0ba902b9',
    parentSpanId: 'cccccccccccccccc',
    reasoningStep: 'STEP_5_GENERATION_VERIFICATION',
    tool: 'generate_cohort',
    outcome: 'SUCCESS',
    clinicalRationale: 'Generate to check the cohort size is plausible.',
    evidenceReference: 'Phenotype review plan',
    errorMessage: null,
    userLogin: 'analyst',
    startedAt: Date.UTC(2026, 10, 4, 9, 2, 0),
    finishedAt: Date.UTC(2026, 10, 4, 9, 2, 1),
  },
]

async function mockCohort(page: Page, provenance: { status: number; body: unknown }) {
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
        name: 'GI bleed, age 40+',
        description: 'Built by an AI agent through WebAPI MCP',
        expression: JSON.stringify(loadedCohort),
      }),
    })
  })

  await page.route('**/WebAPI/cohortdefinition/1/mcp-provenance', async route => {
    await route.fulfill({
      status: provenance.status,
      contentType: 'application/json',
      body: JSON.stringify(provenance.body),
    })
  })
}

test.describe('AI agent history', () => {
  test('lists the agent calls behind a cohort, with their rationale', async ({ page }) => {
    await mockCohort(page, { status: 200, body: PROVENANCE })
    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)

    const button = page.getByTestId('agent-provenance-icon')
    await expect(button).toBeVisible()
    await button.click()

    const entries = page.getByTestId('agent-provenance-entry')
    await expect(entries).toHaveCount(3)
    await expect(page.getByText(RATIONALE)).toBeVisible()
    await expect(page.getByTestId('agent-provenance-outcome-REJECTED')).toHaveText('Refused')
    await expect(page.getByText('not "Upper GI bleed"', { exact: false })).toBeVisible()
    await expect(page.getByText(`trace ${TRACE_ID}`)).toBeVisible()
    await expect(page.getByText('Generation and verification')).toBeVisible()
  })

  test('shows no history button for a cohort built by hand', async ({ page }) => {
    await mockCohort(page, { status: 200, body: [] })
    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)

    await expect(page.getByTestId('versions-icon')).toBeVisible()
    await expect(page.getByTestId('agent-provenance-icon')).toHaveCount(0)
  })

  test('shows no history button against a WebAPI without the MCP server', async ({ page }) => {
    await mockCohort(page, { status: 404, body: {} })
    await page.goto('/#/cohorts/1')
    await waitForNetworkIdle(page)

    await expect(page.getByTestId('versions-icon')).toBeVisible()
    await expect(page.getByTestId('agent-provenance-icon')).toHaveCount(0)
  })
})
