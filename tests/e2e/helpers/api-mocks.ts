/**
 * Common API mocks for E2E tests
 * Provides mock responses for WebAPI endpoints
 */

import type { Page, Route } from '@playwright/test'
import {
  mockCohorts,
  mockDatasources,
  mockDashboardReport,
  mockPersonReport,
  mockDiabetesConcepts,
  mockCardiovascularConcepts,
  createConceptSearchResponse
} from '../fixtures'

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

    // Set auth token to bypass authentication dialog
    // Token must be valid JWT format with exp claim far in the future
    // This is a mock JWT: header.payload.signature
    // Payload contains: {"sub":"test_user","name":"Test User","exp":9999999999,"iat":1516239022}
    const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0X3VzZXIiLCJuYW1lIjoiVGVzdCBVc2VyIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
    localStorage.setItem('bearerToken', mockToken)
    localStorage.setItem('auth-client', 'TestClient')

    // Also set the cookie for bearerToken
    document.cookie = `bearerToken=${mockToken}; path=/; SameSite=Lax`
  })

  // Mock user/me endpoint to return authenticated user
  await page.route('**/user/me', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        login: 'test_user',
        name: 'Test User',
        id: 1,
        permissionIdx: {},
        permissionsBySourceKey: {}
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
      // Mock cohort creation
      const newCohort = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          ...newCohort,
          id: 999,
          createdDate: Date.now(),
          modifiedDate: Date.now()
        })
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
    } else if (match && route.request().method() === 'PUT') {
      // Mock cohort update
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: route.request().postData() || '{}'
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
    const url = route.request().url()
    const searchParams = new URLSearchParams(url.split('?')[1] || '')
    const query = searchParams.get('query')?.toLowerCase() || ''

    let results = mockDiabetesConcepts
    if (query.includes('cardio') || query.includes('hypert') || query.includes('heart')) {
      results = mockCardiovascularConcepts
    } else if (query.includes('diabet')) {
      results = mockDiabetesConcepts
    }

    const _response = createConceptSearchResponse(results, 20, 0)

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(results)
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
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(concept)
        })
      } else {
        await route.fulfill({ status: 404, body: 'Concept not found' })
      }
    } else {
      await route.continue()
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
      body: JSON.stringify({
        SERIES_NAME: ['Condition', 'Drug', 'Procedure'],
        X_CALENDAR_MONTH: ['2010-01', '2010-02', '2010-03', '2010-04'],
        Y_RECORD_COUNT: [1000, 1200, 1500, 1800]
      })
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
