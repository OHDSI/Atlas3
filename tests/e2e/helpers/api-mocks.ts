/**
 * Common API mocks for E2E tests
 * Provides mock responses for WebAPI endpoints
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import type { Page, Route } from '@playwright/test'
import {
  mockCohorts,
  mockDatasources,
  mockDashboardReport,
  mockPersonReport,
  mockDiabetesConcepts,
  mockCardiovascularConcepts
} from '../fixtures'

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

/**
 * Setup basic API mocks for all tests
 * This includes sources, translations, and common endpoints
 */
export async function setupBasicMocks(page: Page) {
  // Auto-accept license agreement and set up auth bypass to prevent dialogs from blocking tests
  await page.addInitScript(() => {
    const LICENSE_ACCEPTANCE_KEY = 'atlas3-license-acceptance-date'
    // Set acceptance date to current time to bypass license dialog
    localStorage.setItem(LICENSE_ACCEPTANCE_KEY, Date.now().toString())

    // The cohorts overview now defaults to the table view. The card/grid-based
    // e2e specs assert on .cohort-grid / .cohort-card, so persist the tile
    // preference here to render the grid those specs exercise.
    localStorage.setItem('cohorts-view-mode', 'tile')

    // Set auth token to bypass authentication dialog
    // Token must be valid JWT format with exp claim far in the future
    // This is a mock JWT: header.payload.signature
    // Payload contains: {"sub":"test_user","name":"Test User","exp":9999999999,"iat":1516239022}
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
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
  })

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

  // Mock user/refresh endpoint
  await page.route('**/user/refresh', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        refreshToken: 'mock-new-refresh-token'
      })
    })
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
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCohorts)
      })
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
        body: JSON.stringify(stored),
      })
    } else {
      await route.continue()
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
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(stored)
         })
        return
       }
      // Fall back to mockCohorts
      const cohort = mockCohorts.find(c => c.id === cohortId)

      if (cohort) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...cohort,
            expression: {
              ConceptSets: [],
              PrimaryCriteria: {
                CriteriaList: [],
                ObservationWindow: { PriorDays: 0, PostDays: 0 },
                PrimaryCriteriaLimit: { Type: 'All' }
              },
              QualifiedLimit: { Type: 'First' },
              ExpressionLimit: { Type: 'All' },
              InclusionRules: [],
              EndStrategy: { DateOffset: { DateField: 'EndDate', Offset: 0 } },
              CensoringCriteria: [],
              CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
              CensorWindow: {}
            }
          })
        })
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
          body: JSON.stringify(putData)
        })
    } else if (match && route.request().method() === 'DELETE') {
      // Mock cohort deletion
      await route.fulfill({ status: 204 })
    } else {
      await route.continue()
    }
  })

  // Mock cohort generation endpoint
  await page.route('**/WebAPI/cohortdefinition/*/generate/*', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobId: 1,
        status: 'COMPLETED',
        personCount: 1234
      })
    })
  })

  // Mock cohort generation info endpoint
  await page.route('**/WebAPI/cohortdefinition/*/info', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: { sourceId: 6, cohortId: 1 },
          status: 'COMPLETE',
          personCount: 1234,
          recordCount: 1234,
          startTime: Date.now() - 10000,
          executionDuration: 5000,
          failMessage: null
        }
      ])
    })
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
    const webApiShape = results.map(c => ({
      CONCEPT_ID: c.conceptId,
      CONCEPT_NAME: c.conceptName,
      CONCEPT_CODE: c.conceptCode,
      DOMAIN_ID: c.domainId,
      VOCABULARY_ID: c.vocabularyId,
      CONCEPT_CLASS_ID: c.conceptClassId,
      STANDARD_CONCEPT: c.standardConcept,
      INVALID_REASON: c.invalidReason
    }))

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(webApiShape)
    })
  })

  // Mock concept lookup endpoint
  await page.route('**/WebAPI/vocabulary/*/concept/*', async (route: Route) => {
    const url = route.request().url()
    const match = url.match(/concept\/(\d+)/)

    if (match) {
      const conceptId = parseInt(match[1])
      const allConcepts = [...mockDiabetesConcepts, ...mockCardiovascularConcepts]
      const concept = allConcepts.find(c => c.conceptId === conceptId)

      if (concept) {
        // Same uppercase-shape requirement as the search endpoint above
        // (ConceptSearchResponseSchema.element) — the camelCase fixture
        // fails validation and surfaces as "Failed to load concept".
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            CONCEPT_ID: concept.conceptId,
            CONCEPT_NAME: concept.conceptName,
            CONCEPT_CODE: concept.conceptCode,
            DOMAIN_ID: concept.domainId,
            VOCABULARY_ID: concept.vocabularyId,
            CONCEPT_CLASS_ID: concept.conceptClassId,
            STANDARD_CONCEPT: concept.standardConcept,
            INVALID_REASON: concept.invalidReason
          })
        })
      } else {
        await route.fulfill({ status: 404, body: 'Concept not found' })
      }
    } else {
      await route.continue()
    }
  })

  // Mock concept related/hierarchy lookups used by the concept detail view —
  // unmocked, these fall through to the dev proxy and 503, which used to
  // leave ConceptDetailContent stuck failing to load in e2e tests.
  await page.route('**/WebAPI/vocabulary/*/concept/*/related', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )
  await page.route('**/WebAPI/vocabulary/*/concept/*/ancestorAndDescendant', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  )

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
      await route.continue()
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
  // /cohortdefinition/{id} and reads `expression` (string or object).
  // This handler is registered after the generic **/cohortdefinition/** route
  // so it takes precedence for id 42.
  await page.route('**/WebAPI/cohortdefinition/42', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 42,
        name: 'Hypertension',
        expression: '{"ConceptSets":[{"id":0,"name":"ACE Inhibitors","expression":{"items":[]}}]}'
      })
    })
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

  // Mock characterization design snapshot
  await page.route('**/cohort-characterization/*/design', async (route: Route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
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
