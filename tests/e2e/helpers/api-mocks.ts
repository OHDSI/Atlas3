/**
 * Common API mocks for E2E tests
 * Provides mock responses for WebAPI endpoints
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { Page, Route } from '@playwright/test'
import { z } from 'zod'
import {
  mockCohorts,
  mockDatasources,
  mockDashboardReport,
  mockPersonReport,
  mockDiabetesConcepts,
  mockCardiovascularConcepts
} from '../fixtures'
import {
  CohortDefinitionListSchema,
  CohortGenerationInfoListSchema,
} from '../../../src/models/webapi.types'
import { ConceptSearchResponseSchema } from '../../../src/models/concept-set.types'
import { CharacterizationDefinitionSchema } from '../../../src/models/characterization.types'
import { CohortDefExpressionSchema } from '../../../src/models/profile.types'

// ---------------------------------------------------------------------------
// Mock-drift guard
// ---------------------------------------------------------------------------
//
// A mock the app rejects is worse than no mock: the spec still renders enough
// DOM to satisfy a "did it crash?" assertion, so it stays green while testing
// nothing. Several mocks in this file had drifted that far — /cohortdefinition/
// {id}/info returned `id: {sourceId, cohortId}` against a schema demanding
// `{cohortDefinitionId, sourceId}` (parseOrThrow, so it threw on *every* call),
// /user/refresh returned `token` where authService reads `jwt`, the concept
// lookup returned camelCase against an UPPERCASE schema, and the
// characterization design returned `{}` against a schema requiring four fields.
//
// Everything below now goes through checkedBody()/fulfillChecked(), which runs
// the payload through the same Zod schema the app parses it with. A drifted
// mock throws out of the route handler — Playwright fails the test on the spot,
// naming the endpoint and the offending field — instead of being served to an
// app that silently discards it.
function checkedBody(schema: z.ZodTypeAny, payload: unknown, label: string): string {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n')
    throw new Error(
      `E2E mock drift: the payload for ${label} does not match the schema the app ` +
        `parses that response with.\n${issues}\n` +
        `Payload: ${JSON.stringify(payload).slice(0, 600)}`
    )
  }
  return JSON.stringify(payload)
}

async function fulfillChecked(
  route: Route,
  schema: z.ZodTypeAny,
  payload: unknown,
  label: string
): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: checkedBody(schema, payload, label),
  })
}

// Endpoints the app reads without a Zod schema of its own. The schemas below
// mirror exactly what the consuming code destructures, so a mock that stops
// feeding that code still fails here.

// authService.refreshToken() reads `body?.jwt` and returns false when absent.
const UserRefreshSchema = z.object({ jwt: z.string().min(1) })

// generateCohort() reads status/executionId/startDate/endDate off WebAPI's job
// execution object; `status` must be one of the raw Spring Batch values that
// toGenerationStatus() knows, not an already-normalized internal status.
const GenerateJobSchema = z.object({
  executionId: z.number(),
  status: z.enum([
    'PENDING',
    'STARTING',
    'STARTED',
    'RUNNING',
    'STOPPING',
    'COMPLETE',
    'COMPLETED',
    'FAILED',
    'STOPPED',
    'ABANDONED',
  ]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

// GET /cohortdefinition/{id}. getCohortDefinition() returns the body untyped,
// but CohortBuilder.applyAtlasCohort() needs id/name/expression, and
// profile.service.getCohortConceptSets() JSON.parses `expression` and feeds it
// to CohortDefExpressionSchema. WebAPI serializes `expression` as a JSON
// string on this endpoint, so require that and validate what it decodes to.
const CohortDefinitionDetailSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable().optional(),
    expression: z
      .string()
      .refine(s => CohortDefExpressionSchema.safeParse(safeJsonParse(s)).success, {
        message: 'expression must be a JSON string decoding to a cohort expression',
      }),
  })
  .passthrough()

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

// WebAPI hands back `expression` as a JSON string on every /cohortdefinition
// route. This file used to emit it as an object on the generic handler and as a
// string on the id-42 handler, so half the specs exercised a code path
// (`typeof expression === 'string'` in CohortBuilder.applyAtlasCohort and
// profile.service.getCohortConceptSets) that production never takes and the
// other half exercised the one it does. Serialize on the way out, always.
function toWireCohortDefinition(def: Record<string, unknown>): Record<string, unknown> {
  const { expression, ...rest } = def
  return {
    ...rest,
    expression: typeof expression === 'string' ? expression : JSON.stringify(expression ?? {}),
  }
}

// A structurally complete but empty Atlas expression, for cohorts served out of
// the mockCohorts fixture (which carries metadata only).
const EMPTY_COHORT_EXPRESSION = {
  ConceptSets: [],
  PrimaryCriteria: {
    CriteriaList: [],
    ObservationWindow: { PriorDays: 0, PostDays: 0 },
    PrimaryCriteriaLimit: { Type: 'All' },
  },
  QualifiedLimit: { Type: 'First' },
  ExpressionLimit: { Type: 'All' },
  InclusionRules: [],
  EndStrategy: { DateOffset: { DateField: 'EndDate', Offset: 0 } },
  CensoringCriteria: [],
  CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
  CensorWindow: {},
}

// Generation timestamps are pinned rather than derived from Date.now() so the
// "started N minutes ago" cells a generation panel renders stay byte-stable.
// 2026-01-15T12:00:00Z, the same instant setupAnalysisListMocks pins.
const FIXED_GENERATION_START = 1768478400000

// The WebAPI wire shape for a concept: UPPERCASE column names straight out of
// the vocabulary tables. The camelCase fixtures are the app's internal shape.
function toWebApiConcept(c: {
  conceptId: number
  conceptName: string
  conceptCode: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept: string | null
  invalidReason: string | null
}) {
  return {
    CONCEPT_ID: c.conceptId,
    CONCEPT_NAME: c.conceptName,
    CONCEPT_CODE: c.conceptCode,
    DOMAIN_ID: c.domainId,
    VOCABULARY_ID: c.vocabularyId,
    CONCEPT_CLASS_ID: c.conceptClassId,
    STANDARD_CONCEPT: c.standardConcept,
    INVALID_REASON: c.invalidReason,
  }
}

// In-memory store for cohorts — persists data between requests.
// Used by the PhenotypeLibrary integration tests to simulate a real backend.
// Clear this map between tests by calling clearCohortStore().
const cohortStore = new Map<number, Record<string, unknown>>()

/**
 * Clear the in-memory cohort store. Call this in test.beforeEach
 * to ensure each test starts with a clean slate.
 */
export function clearCohortStore(): void {
  cohortStore.clear()
}

export function seedCohortStore(id: number, data: Record<string, unknown>): void {
  cohortStore.set(id, data)
}

// Load the person profile fixture (JSON) at module load time. We avoid
// `import x from '*.json'` because the test runner's ESM mode requires an
// explicit `with { type: 'json' }` attribute; readFileSync sidesteps that.
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const personProfileFixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../fixtures/person-profile.json'), 'utf-8')
)

// Shared between the localStorage seed in the init script and the /user/refresh
// mock, so a refresh hands back the same identity the page booted with.
const MOCK_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'

/**
 * Setup basic API mocks for all tests
 * This includes sources, translations, and common endpoints
 */
export async function setupBasicMocks(page: Page) {
  // Auto-accept license agreement and set up auth bypass to prevent dialogs from blocking tests
  await page.addInitScript((mockToken: string) => {
    const LICENSE_ACCEPTANCE_KEY = 'atlas3-license-acceptance-date'
    // Set acceptance date to current time to bypass license dialog
    localStorage.setItem(LICENSE_ACCEPTANCE_KEY, Date.now().toString())

    // The cohorts overview now defaults to the table view. The card/grid-based
    // e2e specs assert on .cohort-grid / .cohort-card, so persist the tile
    // preference here to render the grid those specs exercise.
    localStorage.setItem('cohorts-view-mode', 'tile')

    // Set auth token to bypass authentication dialog. MOCK_JWT is a valid JWT
    // shape (header.payload.signature) whose payload carries an exp far in the
    // future: {"sub":"test_user","name":"Test User","exp":9999999999,...}
    localStorage.setItem('bearerToken', mockToken)
    localStorage.setItem('auth-client', 'TestClient')

    // Also set the cookie for bearerToken
    document.cookie = `bearerToken=${mockToken}; path=/; SameSite=Lax`

    // Work around a known race on the DataSources view: the page mounts
    // both the store (which calls listDataSources) and the config panel's
    // TrexSQLCacheSection (which also calls listDataSources via
    // detectTrexSQLAvailability). Both invocations share a single
    // AbortController in datasource.service — the second cancels the
    // first, surfacing a bogus "Unable to load data sources" error even
    // though the second succeeds. We dedupe concurrent fetches for
    // /source/sources at the window.fetch layer so both callers share
    // the same response promise and neither gets aborted.
    const originalFetch = window.fetch.bind(window)
    const inFlight = new Map<string, Promise<Response>>()
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      const method = (init?.method || 'GET').toUpperCase()
      if (method === 'GET' && url.includes('/source/sources')) {
        const existing = inFlight.get(url)
        if (existing) return existing.then((r) => r.clone())
        // Strip the abort signal so one caller's cancel doesn't kill the shared fetch.
        const safeInit = { ...(init || {}) }
        delete safeInit.signal
        const promise = originalFetch(input, safeInit).finally(() => inFlight.delete(url))
        inFlight.set(url, promise)
        return promise.then((r) => r.clone())
      }
      return originalFetch(input, init)
    }
  }, MOCK_JWT)

  // Mock user/me endpoint to return authenticated user.
  await page.route('**/user/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        login: 'test_user',
        name: 'Test User',
        id: 1,
        // Wildcard grants every permission so action buttons gated by
        // hasPermission(...) (e.g. create/import cohort, delete) stay enabled.
        // parseUserInfo reads `authz.permissions ?? data.permissions`, so we
        // expose it under both keys to cover legacy and WebAPI 3.0 shapes.
        permissions: ['*'],
        authz: { permissions: ['*'] },
        permissionsBySourceKey: {},
        trexsqlCacheEnabled: false
      })
    })
  })

  // Mock user/refresh endpoint. WebAPI answers with the renewed bearer under
  // `jwt` — which is the only key authService.refreshToken() looks at. The old
  // `{ token, refreshToken }` body made every refresh return false silently.
  await page.route('**/user/refresh', async (route: Route) => {
    await fulfillChecked(
      route,
      UserRefreshSchema,
      { jwt: MOCK_JWT },
      'GET /user/refresh'
    )
  })

  // Mock CDM sources endpoint
  await page.route('**/source/sources', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDatasources)
    })
  })

  // Mock translation/locales endpoint
  await page.route('**/translation/locales', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['en', 'de', 'fr'])
    })
  })

  // Mock translation bundles (English fallback)
  await page.route('**/translation/bundle/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        locale: 'en',
        translations: {}
      })
    })
  })

  // Mock cohort definitions list endpoint
  await page.route('**/cohortdefinition', async (route: Route) => {
    const url = route.request().url()

    // Only handle the list endpoint, not detail endpoints
    if (url.match(/cohortdefinition$/) && route.request().method() === 'GET') {
      await fulfillChecked(
        route,
        CohortDefinitionListSchema,
        mockCohorts,
        'GET /cohortdefinition'
      )
    } else if (url.match(/cohortdefinition$/) && route.request().method() === 'POST') {
      // Mock cohort creation — assign a unique ID and persist so the
      // subsequent GET /cohortdefinition/{id} can find it.
      const newCohort = JSON.parse(route.request().postData() || '{}')
      const newId = 900 + cohortStore.size
      const stored = {
        ...newCohort,
        id: newId,
        createdDate: Date.now(),
        modifiedDate: Date.now(),
      }
      cohortStore.set(newId, stored)
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: checkedBody(
          CohortDefinitionDetailSchema,
          toWireCohortDefinition(stored),
          'POST /cohortdefinition'
        ),
      })
    } else {
      // Defer to any broader handler (and, failing that, the network) —
      // route.continue() would skip the remaining handlers outright.
      await route.fallback()
    }
  })

  // Mock individual cohort detail endpoint
  await page.route('**/cohortdefinition/**', async (route: Route) => {
    const url = route.request().url()
    const match = url.match(/cohortdefinition\/(\d+)(?:$|\/|\?)/)

    if (match && route.request().method() === 'GET') {
      const cohortId = parseInt(match[1])
      // Check in-memory store first (for round-trip tests)
      const stored = cohortStore.get(cohortId)
      if (stored) {
        await fulfillChecked(
          route,
          CohortDefinitionDetailSchema,
          toWireCohortDefinition(stored),
          `GET /cohortdefinition/${cohortId}`
        )
        return
       }
      // Fall back to mockCohorts
      const cohort = mockCohorts.find(c => c.id === cohortId)

      if (cohort) {
        await fulfillChecked(
          route,
          CohortDefinitionDetailSchema,
          toWireCohortDefinition({ ...cohort, expression: EMPTY_COHORT_EXPRESSION }),
          `GET /cohortdefinition/${cohortId}`
        )
      } else {
        await route.fulfill({ status: 404, body: 'Not found' })
      }
      } else if (match && route.request().method() === "PUT") {
        // Mock cohort update — also persist for round-trip tests
        const putData = JSON.parse(route.request().postData() || "{}")
        const putId = parseInt(match[1])
        cohortStore.set(putId, putData)
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: checkedBody(
            CohortDefinitionDetailSchema,
            toWireCohortDefinition({ id: putId, ...putData }),
            `PUT /cohortdefinition/${putId}`
          ),
        })
    } else if (match && route.request().method() === 'DELETE') {
      // Mock cohort deletion
      await route.fulfill({ status: 204 })
    } else {
      await route.fallback()
    }
  })

  // Mock cohort generation endpoint. generateCohort() reads executionId /
  // startDate / endDate and normalizes the raw job-execution status; the old
  // `{ jobId, status: 'COMPLETED', personCount }` body matched none of those
  // reads, so every generated job came back with a Date.now() id and no times.
  await page.route('**/WebAPI/cohortdefinition/*/generate/*', async (route: Route) => {
    await fulfillChecked(
      route,
      GenerateJobSchema,
      {
        executionId: 1,
        status: 'COMPLETED',
        startDate: new Date(FIXED_GENERATION_START).toISOString(),
        endDate: new Date(FIXED_GENERATION_START + 5000).toISOString(),
      },
      'GET /cohortdefinition/{id}/generate/{sourceKey}'
    )
  })

  // Mock cohort generation info endpoint. The composite key is
  // `{ cohortDefinitionId, sourceId }` — CohortGenerationIdSchema requires both
  // and does not allow unknown keys, and getCohortGenerationInfo() parses with
  // parseOrThrow. The previous `{ sourceId, cohortId }` therefore threw on every
  // single call, so no spec here ever saw a generation status at all.
  await page.route('**/WebAPI/cohortdefinition/*/info', async (route: Route) => {
    const cohortId = Number(route.request().url().match(/cohortdefinition\/(\d+)\/info/)?.[1] ?? 1)
    await fulfillChecked(
      route,
      CohortGenerationInfoListSchema,
      [
        {
          id: { cohortDefinitionId: cohortId, sourceId: 6 },
          status: 'COMPLETE',
          personCount: 1234,
          recordCount: 1234,
          startTime: FIXED_GENERATION_START,
          executionDuration: 5000,
          isValid: true,
          isCanceled: false,
          failMessage: null,
        },
      ],
      `GET /cohortdefinition/${cohortId}/info`
    )
  })

  // Mock concept sets list endpoint
  await page.route('**/WebAPI/conceptset', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Test Concept Set 1',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-01T00:00:00.000Z')
        },
        {
          id: 2,
          name: 'Diabetes Medications',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-02T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-02T00:00:00.000Z')
        },
        {
          id: 3,
          name: 'Type 2 Diabetes',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-03T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-03T00:00:00.000Z')
        }
      ])
    })
  })

  // Mock vocabulary search endpoint (concept search)
  await page.route('**/WebAPI/vocabulary/*/search**', async (route: Route) => {
    // The app POSTs { QUERY: ... }; older callers used ?query=. Support both.
    const url = route.request().url()
    const searchParams = new URLSearchParams(url.split('?')[1] || '')
    let query = searchParams.get('query')?.toLowerCase() || ''
    if (!query) {
      try {
        const body = route.request().postDataJSON() as { QUERY?: string } | null
        query = (body?.QUERY || '').toLowerCase()
      } catch {
        query = ''
      }
    }

    let results = mockDiabetesConcepts
    if (query.includes('cardio') || query.includes('hypert') || query.includes('heart')) {
      results = mockCardiovascularConcepts
    } else if (query.includes('diabet')) {
      results = mockDiabetesConcepts
    } else if (query) {
      results = []
    }

    // The app validates against WebAPI's raw uppercase field names
    // (ConceptSearchResponseSchema); the camelCase fixture shape fails that
    // parse and used to make every search silently return zero rows.
    await fulfillChecked(
      route,
      ConceptSearchResponseSchema,
      results.map(toWebApiConcept),
      'POST /vocabulary/{sourceKey}/search'
    )
  })

  // Mock concept lookup endpoint. getConceptById() parses the body with
  // ConceptSearchResponseSchema.element — the same UPPERCASE shape as the
  // sibling search route above. This handler was still returning the camelCase
  // fixture verbatim, so every single-concept lookup raised "Invalid concept
  // detail response" and the caller rendered nothing.
  await page.route('**/WebAPI/vocabulary/*/concept/*', async (route: Route) => {
    const url = route.request().url()
    const match = url.match(/concept\/(\d+)/)

    if (match) {
      const conceptId = parseInt(match[1])
      const allConcepts = [...mockDiabetesConcepts, ...mockCardiovascularConcepts]
      const concept = allConcepts.find(c => c.conceptId === conceptId)

      if (concept) {
        await fulfillChecked(
          route,
          ConceptSearchResponseSchema.element,
          toWebApiConcept(concept),
          `GET /vocabulary/{sourceKey}/concept/${conceptId}`
        )
      } else {
        await route.fulfill({ status: 404, body: 'Concept not found' })
      }
    } else {
      await route.fallback()
    }
  })

  // Mock config/settings endpoint
  await page.route('**/WebAPI/source/config', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userAuthenticationEnabled: false,
        plpEnabled: true,
        authProviders: [],
        defaultLocale: 'en',
        vocabularyUrl: '/WebAPI/vocabulary'
      })
    })
  })

  // Mock info endpoint
  await page.route('**/WebAPI/info', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        version: '2.14.0',
        schemaVersion: '2.14.0'
      })
    })
  })

  // Mock tags endpoint (for tag groups)
  await page.route('**/WebAPI/tag/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  await page.route('**/WebAPI/tag', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  // Mock person profile endpoint: GET /WebAPI/{sourceKey}/person/{personId}?cohort={id}
  // Used by the Profiles feature.
  await page.route('**/WebAPI/*/person/*', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(personProfileFixture)
    })
  })

  // Mock cohort-definition fetch for the profiles cohort context (id 42).
  // The Profiles feature calls getCohortConceptSets, which fetches
  // /cohortdefinition/{id} and JSON-parses `expression`.
  // This handler is registered after the generic **/cohortdefinition/** route
  // so it takes precedence for id 42; non-GET methods fall back to that
  // handler rather than being pushed at the network.
  await page.route('**/WebAPI/cohortdefinition/42', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await fulfillChecked(
      route,
      CohortDefinitionDetailSchema,
      toWireCohortDefinition({
        id: 42,
        name: 'Hypertension',
        expression: {
          ConceptSets: [{ id: 0, name: 'ACE Inhibitors', expression: { items: [] } }],
        },
      }),
      'GET /cohortdefinition/42'
    )
  })

  // Mock i18n endpoints (locale list + translation bundles)
  await page.route('**/WebAPI/i18n/locales', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '["en"]' })
  })
  await page.route('**/WebAPI/i18n**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // Mock job execution polling endpoint
  await page.route('**/job/execution**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"content":[]}' })
  })

  // Mock TrexSQL cache endpoints
  await page.route('**/trexsql/**/cache/**', async (route: Route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })
  await page.route('**/trexsql/cache/**', async (route: Route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })

  // Mock cohort definition checkV2 endpoint
  await page.route('**/cohortdefinition/checkV2**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })

  // Mock cohort version history endpoint
  await page.route('**/cohortdefinition/*/version/**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  })

  // Mock feature analysis list (used by characterization builder)
  await page.route('**/feature-analysis?size=*', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [], totalElements: 0 }) })
  })

  // Mock characterization design snapshot. getCharacterization() parses this
  // with CharacterizationDefinitionSchema via parseOrThrow, which requires
  // name/cohorts/featureAnalyses/stratas — the previous `{}` failed on all four
  // and the builder silently fell back to its blank state on every load.
  await page.route('**/cohort-characterization/*/design', async (route: Route) => {
    const id = Number(
      route.request().url().match(/cohort-characterization\/(\d+)\/design/)?.[1] ?? 1
    )
    await fulfillChecked(
      route,
      CharacterizationDefinitionSchema,
      {
        id,
        name: 'Test Characterization',
        description: 'Mock characterization design',
        cohorts: [],
        featureAnalyses: [],
        stratas: [],
      },
      `GET /cohort-characterization/${id}/design`
    )
  })
}

// Fixed instant every analysis-list mock renders against, so the relative
// "modified 2 days ago" cells in AnalysisDataTable stay byte-stable instead of
// drifting with the wall clock. 2026-01-15T12:00:00Z.
const FIXED_NOW = 1768478400000
const DAY = 86400000

/**
 * Mock the three analysis-hub list endpoints — characterizations, pathways and
 * incidence rates.
 *
 * Without these, those routes fall through the Vite dev server's `/WebAPI`
 * proxy (vite.config.ts) to whatever is listening on localhost:8080. On a
 * developer box running WebAPI that renders live rows; in CI nothing is
 * listening, the proxy returns ECONNREFUSED and the pages render their loading
 * or error state instead. Screenshots and axe scans captured under one of those
 * conditions can never reproduce under the other.
 *
 * Also pins the clock, because AnalysisDataTable renders modified/created as
 * relative time. Call after setupBasicMocks and before page.goto.
 */
export async function setupAnalysisListMocks(page: Page) {
  await page.clock.setFixedTime(new Date(FIXED_NOW))

  // The three list endpoints do not agree on a user shape: characterizations
  // parses createdBy with UserRefSchema (login/name), incidence rates with the
  // stricter userSchema (numeric id + name). A wrong shape fails Zod and the
  // view renders its error state instead of rows.
  const owner = { login: 'atlas', name: 'ATLAS' }
  const strictOwner = { id: 1, name: 'ATLAS' }

  await page.route('**/cohort-characterization?size=*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Diabetes baseline characterization',
          description: 'Demographics and comorbidities at index',
          tags: [],
          cohorts: [],
          featureAnalyses: [],
          createdBy: owner,
          createdDate: FIXED_NOW - 30 * DAY,
          modifiedDate: FIXED_NOW - 2 * DAY,
        },
        {
          id: 2,
          name: 'Hypertension treatment characterization',
          description: 'Drug exposure summary',
          tags: [],
          cohorts: [],
          featureAnalyses: [],
          createdBy: owner,
          createdDate: FIXED_NOW - 60 * DAY,
          modifiedDate: FIXED_NOW - 10 * DAY,
        },
      ]),
    })
  })

  await page.route('**/pathway-analysis?size=*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        content: [
          {
            id: 1,
            name: 'Type 2 diabetes treatment pathway',
            description: 'First-line therapy sequences',
            targetCohorts: [],
            eventCohorts: [],
            combinationWindow: 30,
            minCellCount: 5,
            maxDepth: 5,
            allowRepeats: false,
            tags: [],
            createdBy: owner,
            createdDate: FIXED_NOW - 45 * DAY,
            modifiedDate: FIXED_NOW - 5 * DAY,
          },
        ],
        totalElements: 1,
      }),
    })
  })

  await page.route('**/ir/', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Incidence of acute myocardial infarction',
          description: 'Per 1000 person-years',
          tags: [],
          createdBy: strictOwner,
          createdDate: FIXED_NOW - 90 * DAY,
          modifiedDate: FIXED_NOW - 7 * DAY,
        },
      ]),
    })
  })
}

/**
 * Force the nav bar's theme toggle to render regardless of the shipped
 * deployment config. `settings.theme.enableDarkMode` defaults to false in
 * plugins.json (dark mode is opt-in per deployment) — the dark-mode specs
 * need the toggle visible to exercise it, so they patch the manifest
 * response instead of flipping the shipped default. Call after
 * setupBasicMocks/setupDatasourcesMocks and before page.goto.
 */
export async function enableDarkModeToggle(page: Page) {
  // Read the shipped manifest from disk rather than route.fetch()-ing it: that
  // round-trip races the plugin config loader's own timeout under load, and a
  // manifest that arrives late leaves the nav without a theme toggle at all.
  const manifestPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../public/config/plugins.json',
  )
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  manifest.settings = manifest.settings ?? {}
  manifest.settings.theme = { ...manifest.settings.theme, enableDarkMode: true }

  await page.route('**/config/plugins.json', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', json: manifest })
  })
}

/**
 * Setup mocks for datasources feature
 */
export async function setupDatasourcesMocks(page: Page) {
  await setupBasicMocks(page)

  // Mock dashboard report
  await page.route('**/WebAPI/cdmresults/*/dashboard', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardReport)
    })
  })

  // Mock person report
  await page.route('**/WebAPI/cdmresults/*/person', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockPersonReport)
    })
  })

  // Mock data density report
  await page.route('**/WebAPI/cdmresults/*/datadensity', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDataDensityReport)
    })
  })

  // Mock observation period report
  await page.route('**/WebAPI/cdmresults/*/observationPeriod', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockObservationPeriodReport)
    })
  })

  // Mock death report
  await page.route('**/WebAPI/cdmresults/*/death', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDeathReport)
    })
  })

  // Mock achilles reports endpoint
  await page.route('**/WebAPI/cdmresults/*/achillesReport', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        summary: mockDashboardReport.summary
      })
    })
  })

  // Mock TrexSQL cache status (returns 404 to indicate TrexSQL is unavailable).
  // Without this, the /trexsql/*\/cache/status request falls through to the
  // vite proxy and hits the real backend, which can trigger extra concurrent
  // /source/sources fetches via useTrexSQLCache.detectTrexSQLAvailability.
  await page.route('**/WebAPI/trexsql/*/cache/status', async (route: Route) => {
    await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
  })

  // Mock i18n endpoints so the locale store doesn't hit the backend
  await page.route('**/WebAPI/i18n/locales', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '["en"]' })
  })
  await page.route('**/WebAPI/i18n**', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
}

/**
 * Mock raw API response for /cdmresults/*\/datadensity
 * Shape matches what transformDataDensityReport expects.
 */
export const mockDataDensityReport = {
  totalRecords: [
    { xCalendarMonth: 201001, seriesName: 'Condition', yRecordCount: 1000 },
    { xCalendarMonth: 201002, seriesName: 'Condition', yRecordCount: 1200 },
    { xCalendarMonth: 201003, seriesName: 'Condition', yRecordCount: 1500 },
    { xCalendarMonth: 201001, seriesName: 'Drug', yRecordCount: 800 },
    { xCalendarMonth: 201002, seriesName: 'Drug', yRecordCount: 950 },
    { xCalendarMonth: 201003, seriesName: 'Drug', yRecordCount: 1100 }
  ],
  recordsPerPerson: [
    { xCalendarMonth: 201001, seriesName: 'Condition', yRecordCount: 2 },
    { xCalendarMonth: 201002, seriesName: 'Condition', yRecordCount: 3 },
    { xCalendarMonth: 201003, seriesName: 'Condition', yRecordCount: 4 },
    { xCalendarMonth: 201001, seriesName: 'Drug', yRecordCount: 1 },
    { xCalendarMonth: 201002, seriesName: 'Drug', yRecordCount: 2 },
    { xCalendarMonth: 201003, seriesName: 'Drug', yRecordCount: 2 }
  ],
  conceptsPerPerson: [
    {
      category: 'Condition',
      minValue: 1,
      p10Value: 3,
      p25Value: 5,
      medianValue: 8,
      p75Value: 12,
      p90Value: 18,
      maxValue: 30
    },
    {
      category: 'Drug',
      minValue: 0,
      p10Value: 2,
      p25Value: 4,
      medianValue: 7,
      p75Value: 11,
      p90Value: 16,
      maxValue: 28
    },
    {
      category: 'Procedure',
      minValue: 0,
      p10Value: 1,
      p25Value: 2,
      medianValue: 4,
      p75Value: 7,
      p90Value: 10,
      maxValue: 20
    }
  ]
}

/**
 * Mock raw API response for /cdmresults/*\/observationPeriod
 * Shape matches what transformObservationPeriodReport expects.
 */
export const mockObservationPeriodReport = {
  ageAtFirst: [
    { intervalIndex: 0, countValue: 120 },
    { intervalIndex: 10, countValue: 340 },
    { intervalIndex: 20, countValue: 500 },
    { intervalIndex: 30, countValue: 640 },
    { intervalIndex: 40, countValue: 780 },
    { intervalIndex: 50, countValue: 820 },
    { intervalIndex: 60, countValue: 700 },
    { intervalIndex: 70, countValue: 420 },
    { intervalIndex: 80, countValue: 180 }
  ],
  observationLength: [
    { intervalIndex: 0, countValue: 200 },
    { intervalIndex: 365, countValue: 800 },
    { intervalIndex: 730, countValue: 1200 },
    { intervalIndex: 1095, countValue: 900 },
    { intervalIndex: 1460, countValue: 500 },
    { intervalIndex: 1825, countValue: 300 }
  ],
  cumulativeObservation: [
    { xLengthOfObservation: 0, yPercentPersons: 100 },
    { xLengthOfObservation: 365, yPercentPersons: 85 },
    { xLengthOfObservation: 730, yPercentPersons: 65 },
    { xLengthOfObservation: 1095, yPercentPersons: 40 },
    { xLengthOfObservation: 1460, yPercentPersons: 20 },
    { xLengthOfObservation: 1825, yPercentPersons: 8 }
  ],
  observedByMonth: [
    { monthYear: 201001, countValue: 1200 },
    { monthYear: 201002, countValue: 1350 },
    { monthYear: 201003, countValue: 1480 },
    { monthYear: 201004, countValue: 1520 },
    { monthYear: 201005, countValue: 1610 }
  ],
  ageByGender: [
    {
      category: 'MALE',
      minValue: 0,
      p10Value: 10,
      p25Value: 25,
      medianValue: 45,
      p75Value: 62,
      p90Value: 75,
      maxValue: 95
    },
    {
      category: 'FEMALE',
      minValue: 0,
      p10Value: 12,
      p25Value: 28,
      medianValue: 48,
      p75Value: 65,
      p90Value: 78,
      maxValue: 98
    }
  ],
  durationByGender: [
    {
      category: 'MALE',
      minValue: 30,
      p10Value: 180,
      p25Value: 365,
      medianValue: 730,
      p75Value: 1460,
      p90Value: 2190,
      maxValue: 3650
    },
    {
      category: 'FEMALE',
      minValue: 30,
      p10Value: 200,
      p25Value: 400,
      medianValue: 800,
      p75Value: 1600,
      p90Value: 2400,
      maxValue: 4000
    }
  ],
  durationByAgeDecile: [
    {
      category: '0-9',
      minValue: 10,
      p10Value: 90,
      p25Value: 180,
      medianValue: 365,
      p75Value: 730,
      p90Value: 1095,
      maxValue: 1825
    },
    {
      category: '10-19',
      minValue: 30,
      p10Value: 180,
      p25Value: 365,
      medianValue: 730,
      p75Value: 1460,
      p90Value: 2190,
      maxValue: 3285
    },
    {
      category: '20-29',
      minValue: 60,
      p10Value: 200,
      p25Value: 400,
      medianValue: 800,
      p75Value: 1600,
      p90Value: 2400,
      maxValue: 3650
    }
  ],
  personsWithContinuousObservationsByYear: [
    { intervalIndex: 2010, countValue: 1200 },
    { intervalIndex: 2011, countValue: 1350 },
    { intervalIndex: 2012, countValue: 1420 },
    { intervalIndex: 2013, countValue: 1500 },
    { intervalIndex: 2014, countValue: 1580 }
  ],
  observationPeriodsPerPerson: [
    { conceptName: '1', countValue: 8500 },
    { conceptName: '2', countValue: 1200 },
    { conceptName: '3', countValue: 250 },
    { conceptName: '4+', countValue: 50 }
  ]
}

/**
 * Mock raw API response for /cdmresults/*\/death
 * Shape matches what transformDeathReport expects.
 */
export const mockDeathReport = {
  ageAtDeath: [
    {
      category: 'MALE',
      minValue: 20,
      p10Value: 55,
      p25Value: 65,
      medianValue: 75,
      p75Value: 82,
      p90Value: 88,
      maxValue: 100
    },
    {
      category: 'FEMALE',
      minValue: 25,
      p10Value: 60,
      p25Value: 70,
      medianValue: 80,
      p75Value: 86,
      p90Value: 92,
      maxValue: 105
    }
  ],
  deathByType: [
    { conceptName: 'EHR record patient status "Deceased"', countValue: 500 },
    { conceptName: 'Death Certificate', countValue: 320 },
    { conceptName: 'Other', countValue: 90 }
  ],
  prevalenceByMonth: [
    { xCalendarMonth: 201001, yPrevalence1000Pp: 2.5 },
    { xCalendarMonth: 201002, yPrevalence1000Pp: 2.8 },
    { xCalendarMonth: 201003, yPrevalence1000Pp: 3.1 },
    { xCalendarMonth: 201004, yPrevalence1000Pp: 2.9 },
    { xCalendarMonth: 201005, yPrevalence1000Pp: 3.2 }
  ],
  prevalenceByGenderAgeYear: [
    { trellisName: '0-9', seriesName: 'MALE', xCalendarYear: 2010, yPrevalence1000Pp: 0.5 },
    { trellisName: '0-9', seriesName: 'MALE', xCalendarYear: 2011, yPrevalence1000Pp: 0.6 },
    { trellisName: '0-9', seriesName: 'FEMALE', xCalendarYear: 2010, yPrevalence1000Pp: 0.4 },
    { trellisName: '0-9', seriesName: 'FEMALE', xCalendarYear: 2011, yPrevalence1000Pp: 0.5 },
    { trellisName: '50-59', seriesName: 'MALE', xCalendarYear: 2010, yPrevalence1000Pp: 5.5 },
    { trellisName: '50-59', seriesName: 'MALE', xCalendarYear: 2011, yPrevalence1000Pp: 5.8 },
    { trellisName: '50-59', seriesName: 'FEMALE', xCalendarYear: 2010, yPrevalence1000Pp: 4.1 },
    { trellisName: '50-59', seriesName: 'FEMALE', xCalendarYear: 2011, yPrevalence1000Pp: 4.3 },
    { trellisName: '80+', seriesName: 'MALE', xCalendarYear: 2010, yPrevalence1000Pp: 85.2 },
    { trellisName: '80+', seriesName: 'MALE', xCalendarYear: 2011, yPrevalence1000Pp: 88.0 },
    { trellisName: '80+', seriesName: 'FEMALE', xCalendarYear: 2010, yPrevalence1000Pp: 78.4 },
    { trellisName: '80+', seriesName: 'FEMALE', xCalendarYear: 2011, yPrevalence1000Pp: 81.5 }
  ]
}

/**
 * Convenience helper — alias for setupDatasourcesMocks.
 * setupDatasourcesMocks already mocks the three chart-parity endpoints
 * (datadensity, observationPeriod, death) with realistic payloads.
 */
export async function setupChartParityMocks(page: Page) {
  await setupDatasourcesMocks(page)
}

/**
 * Setup mocks for reports feature
 */
export async function setupReportsMocks(page: Page) {
  await setupDatasourcesMocks(page)

  // Mock report generation status
  await page.route('**/WebAPI/cdmresults/*/warmup', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'COMPLETE',
        progress: 100
      })
    })
  })
}
