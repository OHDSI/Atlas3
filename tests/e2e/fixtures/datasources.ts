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
 *
 * Shape matches src/models/datasource.types.ts's DashboardAPIResponse (the raw
 * WebAPI /cdmresults/{sourceKey}/dashboard response), which
 * transformDashboardReport in src/utils/datasource-formatters.ts expects —
 * summary as an array of attributeName/attributeValue pairs (not a
 * CDM_SOURCE_ABBREVIATION-keyed object), gender/ageAtFirstObservation keyed by
 * conceptName/countValue, etc. An earlier, differently-shaped version of this
 * fixture (summary as an object, CONCEPT_NAME/COUNT_VALUE keys) predated that
 * schema and made transformDashboardReport throw ("raw.summary.find is not a
 * function"), which setupDatasourcesMocks callers never caught because no
 * existing test asserted the Dashboard report actually renders (only URL/
 * heading checks). Fixed to match reality so the mock produces the real
 * chart instead of silently mapping to the "Unable to load Dashboard report"
 * error state.
 */
export interface MockDashboardReport {
  summary: Array<{ attributeName: string; attributeValue: string }>
  gender: Array<{ conceptName: string; countValue: number; percentValue: number }>
  ageAtFirstObservation: Array<{ intervalIndex: number; countValue: number; percentValue: number }>
  cumulativeObservation: Array<{ seriesName: string; xLengthOfObservation: number; yPercentPersons: number }>
  observedByMonth: Array<{ monthYear: number; countValue: number; percentValue: number }>
}

export const mockDashboardReport: MockDashboardReport = {
  summary: [
    { attributeName: 'Source name', attributeValue: 'SYNPUF 1K' },
    { attributeName: 'CDM source name', attributeValue: 'SYNPUF1K' },
    { attributeName: 'CDM version', attributeValue: '5.4' },
    { attributeName: 'Vocabulary version', attributeValue: 'v5.0 2023-05-01' },
    { attributeName: 'Number of persons', attributeValue: '9500' }
  ],
  gender: [
    { conceptName: 'FEMALE', countValue: 5000, percentValue: 52.6 },
    { conceptName: 'MALE', countValue: 4500, percentValue: 47.4 }
  ],
  ageAtFirstObservation: [
    { intervalIndex: 0, countValue: 500, percentValue: 5.3 },
    { intervalIndex: 10, countValue: 800, percentValue: 8.4 },
    { intervalIndex: 20, countValue: 1200, percentValue: 12.6 },
    { intervalIndex: 30, countValue: 1500, percentValue: 15.8 },
    { intervalIndex: 40, countValue: 1800, percentValue: 18.9 },
    { intervalIndex: 50, countValue: 1500, percentValue: 15.8 },
    { intervalIndex: 60, countValue: 1200, percentValue: 12.6 },
    { intervalIndex: 70, countValue: 800, percentValue: 8.4 },
    { intervalIndex: 80, countValue: 400, percentValue: 4.2 },
    { intervalIndex: 90, countValue: 200, percentValue: 2.1 }
  ],
  // dashboardCumulativeLineOptions (src/ui/chart-config.ts) plots yPercentPersons
  // directly against a y-axis capped at max: 1 and multiplies by 100 in the
  // tooltip formatter, so this must be a 0-1 fraction, not a 0-100 percentage
  // (unlike mockObservationPeriodReport's same-named field below, which feeds a
  // different chart/scale).
  cumulativeObservation: [
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 0, yPercentPersons: 1.0 },
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 365, yPercentPersons: 0.85 },
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 730, yPercentPersons: 0.65 },
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 1095, yPercentPersons: 0.40 },
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 1460, yPercentPersons: 0.20 },
    { seriesName: 'Cumulative Observation', xLengthOfObservation: 1825, yPercentPersons: 0.08 }
  ],
  observedByMonth: [
    { monthYear: 201001, countValue: 1200, percentValue: 12.6 },
    { monthYear: 201002, countValue: 1350, percentValue: 14.2 },
    { monthYear: 201003, countValue: 1480, percentValue: 15.6 },
    { monthYear: 201004, countValue: 1520, percentValue: 16.0 },
    { monthYear: 201005, countValue: 1610, percentValue: 16.9 }
  ]
}

/**
 * Person demographics report data
 *
 * Shape matches PersonRaw in src/utils/datasource-formatters.ts (transformPersonReport's
 * input) — conceptName/countValue distributions plus a yearOfBirthStats
 * envelope (minValue/intervalSize), not the CATEGORY/COUNT_VALUE/CONCEPT_NAME
 * keys the previous version of this fixture used. That mismatch didn't throw
 * (the transform falls back to 'Unknown'/0 for unrecognized keys), so it went
 * unnoticed, but it silently produced empty/zero-value charts — see the
 * mockDashboardReport comment above for the sibling issue on this endpoint.
 */
export interface MockPersonReport {
  yearOfBirth: Array<{ intervalIndex: number; countValue: number; percentValue: number }>
  yearOfBirthStats: Array<{ minValue: number; maxValue: number; intervalSize: number }>
  gender: Array<{ conceptName: string; countValue: number }>
  race: Array<{ conceptName: string; countValue: number }>
  ethnicity: Array<{ conceptName: string; countValue: number }>
}

export const mockPersonReport: MockPersonReport = {
  yearOfBirth: [
    { intervalIndex: 0, countValue: 100, percentValue: 5.3 },
    { intervalIndex: 10, countValue: 200, percentValue: 10.5 },
    { intervalIndex: 20, countValue: 300, percentValue: 15.8 },
    { intervalIndex: 30, countValue: 400, percentValue: 21.1 },
    { intervalIndex: 40, countValue: 500, percentValue: 26.3 }
  ],
  yearOfBirthStats: [{ minValue: 1950, maxValue: 1990, intervalSize: 10 }],
  gender: [
    { conceptName: 'FEMALE', countValue: 800 },
    { conceptName: 'MALE', countValue: 700 }
  ],
  race: [
    { conceptName: 'White', countValue: 900 },
    { conceptName: 'Black or African American', countValue: 400 },
    { conceptName: 'Asian', countValue: 200 }
  ],
  ethnicity: [
    { conceptName: 'Not Hispanic or Latino', countValue: 1200 },
    { conceptName: 'Hispanic or Latino', countValue: 300 }
  ]
}
