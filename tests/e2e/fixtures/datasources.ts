/**
 * Mock datasource data for E2E tests
 * Provides datasource metadata and CDM information
 */

export interface MockDaimon {
  sourceDaimonId: number
  daimonType: 'CDM' | 'Vocabulary' | 'Results'
  tableQualifier: string
  priority: number
}

export interface MockDatasource {
  sourceId: number
  sourceKey: string
  sourceName: string
  sourceDialect: string
  daimons: MockDaimon[]
}

/**
 * Standard datasources for testing
 */
export const mockDatasources: MockDatasource[] = [
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
  },
  {
    sourceId: 7,
    sourceKey: 'SYNPUF5K',
    sourceName: 'SYNPUF 5K',
    sourceDialect: 'postgresql',
    daimons: [
      {
        sourceDaimonId: 19,
        daimonType: 'CDM',
        tableQualifier: 'synpuf5k',
        priority: 0
      },
      {
        sourceDaimonId: 20,
        daimonType: 'Vocabulary',
        tableQualifier: 'unrestricted',
        priority: 0
      },
      {
        sourceDaimonId: 21,
        daimonType: 'Results',
        tableQualifier: 'synpuf5k_results',
        priority: 0
      }
    ]
  }
]

/**
 * Single datasource for detail testing
 */
export const mockDatasourceSingle = mockDatasources[0]

/**
 * Dashboard report data
 */
export interface MockDashboardReport {
  summary: {
    CDM_SOURCE_ABBREVIATION: string
    CDM_VERSION: string
    VOCABULARY_VERSION: string
  }
  gender: Array<{ CONCEPT_NAME: string; COUNT_VALUE: number }>
  age: Array<{ CATEGORY: string; COUNT_VALUE: number }>
}

export const mockDashboardReport: MockDashboardReport = {
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
}

/**
 * Person demographics report data
 */
export interface MockPersonReport {
  yearOfBirth: Array<{ CATEGORY: string; COUNT_VALUE: number }>
  gender: Array<{ CONCEPT_NAME: string; COUNT_VALUE: number }>
  race: Array<{ CONCEPT_NAME: string; COUNT_VALUE: number }>
  ethnicity: Array<{ CONCEPT_NAME: string; COUNT_VALUE: number }>
}

export const mockPersonReport: MockPersonReport = {
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
}
