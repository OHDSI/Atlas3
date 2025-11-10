/**
 * Common API mocks for E2E tests
 * Provides mock responses for WebAPI endpoints
 */

import type { Page, Route } from '@playwright/test'

/**
 * Setup basic API mocks for all tests
 * This includes sources, translations, and common endpoints
 */
export async function setupBasicMocks(page: Page) {
  // Mock CDM sources endpoint
  await page.route('**/WebAPI/source/sources', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          sourceId: 6,
          sourceKey: 'SYNPUF1K',
          sourceName: 'SYNPUF 1K',
          sourceDialect: 'postgresql',
          daimons: [
            {
              sourceDaimonId: 16,
              daimonType: 'CDM',
              tableQualifier: 'synpuf1k',
              priority: 0
            },
            {
              sourceDaimonId: 17,
              daimonType: 'Vocabulary',
              tableQualifier: 'unrestricted',
              priority: 0
            },
            {
              sourceDaimonId: 18,
              daimonType: 'Results',
              tableQualifier: 'synpuf1k_results',
              priority: 0
            }
          ]
        }
      ])
    })
  })

  // Mock translation/locales endpoint
  await page.route('**/WebAPI/translation/locales', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(['en', 'de', 'fr'])
    })
  })

  // Mock translation bundles (English fallback)
  await page.route('**/WebAPI/translation/bundle/en', async (route: Route) => {
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
  await page.route('**/WebAPI/cohortdefinition', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Test Cohort 1',
          description: 'A test cohort for E2E testing',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-01T00:00:00.000Z')
        },
        {
          id: 2,
          name: 'Test Cohort 2',
          description: 'Another test cohort',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-02T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-02T00:00:00.000Z')
        },
        {
          id: 3,
          name: 'Diabetes Cohort',
          description: 'Cohort for diabetes patients',
          createdBy: 'test_user',
          createdDate: Date.parse('2024-01-03T00:00:00.000Z'),
          modifiedBy: 'test_user',
          modifiedDate: Date.parse('2024-01-03T00:00:00.000Z')
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
      body: JSON.stringify({
        summary: {
          CDM_SOURCE_ABBREVIATION: 'SYNPUF1K',
          CDM_VERSION: '5.4',
          VOCABULARY_VERSION: 'v5.0 2023-05-01'
        },
        gender: [
          { CONCEPT_NAME: 'FEMALE', COUNT_VALUE: 5000 },
          { CONCEPT_NAME: 'MALE', COUNT_VALUE: 4500 }
        ],
        age: [
          { CATEGORY: '0-9', COUNT_VALUE: 500 },
          { CATEGORY: '10-19', COUNT_VALUE: 800 },
          { CATEGORY: '20-29', COUNT_VALUE: 1200 },
          { CATEGORY: '30-39', COUNT_VALUE: 1500 },
          { CATEGORY: '40-49', COUNT_VALUE: 1800 },
          { CATEGORY: '50-59', COUNT_VALUE: 1500 },
          { CATEGORY: '60-69', COUNT_VALUE: 1200 },
          { CATEGORY: '70-79', COUNT_VALUE: 800 },
          { CATEGORY: '80-89', COUNT_VALUE: 400 },
          { CATEGORY: '90+', COUNT_VALUE: 200 }
        ]
      })
    })
  })

  // Mock person report
  await page.route('**/WebAPI/cdmresults/*/person', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        yearOfBirth: [
          { CATEGORY: '1950', COUNT_VALUE: 100 },
          { CATEGORY: '1960', COUNT_VALUE: 200 },
          { CATEGORY: '1970', COUNT_VALUE: 300 },
          { CATEGORY: '1980', COUNT_VALUE: 400 },
          { CATEGORY: '1990', COUNT_VALUE: 500 }
        ],
        gender: [
          { CONCEPT_NAME: 'FEMALE', COUNT_VALUE: 800 },
          { CONCEPT_NAME: 'MALE', COUNT_VALUE: 700 }
        ],
        race: [
          { CONCEPT_NAME: 'White', COUNT_VALUE: 900 },
          { CONCEPT_NAME: 'Black or African American', COUNT_VALUE: 400 },
          { CONCEPT_NAME: 'Asian', COUNT_VALUE: 200 }
        ],
        ethnicity: [
          { CONCEPT_NAME: 'Not Hispanic or Latino', COUNT_VALUE: 1200 },
          { CONCEPT_NAME: 'Hispanic or Latino', COUNT_VALUE: 300 }
        ]
      })
    })
  })
}

/**
 * Setup mocks for reports feature
 */
export async function setupReportsMocks(page: Page) {
  await setupDatasourcesMocks(page)
}
