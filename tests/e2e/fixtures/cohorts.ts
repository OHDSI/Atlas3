/**
 * Mock cohort data for E2E tests
 * Provides consistent cohort fixtures without requiring real backend
 */

export interface MockCohort {
  id: number
  name: string
  description: string
  createdBy: string
  createdDate: number // Unix timestamp
  modifiedBy: string
  modifiedDate: number // Unix timestamp
  /**
   * WebAPI's CohortDefinitionDTO.expressionType. 'SIMPLE_EXPRESSION' is the
   * value the server sends and the one this app writes back on save; the
   * builder refuses to open anything else, since it cannot edit it.
   *
   * These fixtures used to carry 'SIMPLE' / 'COMPLEX', which no server sends.
   * That was harmless until the builder started checking the field, at which
   * point every cohort mocked here failed to load and the sections rendered
   * behind `v-if="!loadError"` — Generation among them — silently disappeared.
   */
  expressionType?: 'SIMPLE_EXPRESSION'
}

/**
 * Standard cohort list for general testing
 */
export const mockCohorts: MockCohort[] = [
  {
    id: 1,
    name: 'Test Cohort 1',
    description: 'A test cohort for E2E testing',
    createdBy: 'test_user',
    createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
    modifiedBy: 'test_user',
    modifiedDate: Date.parse('2024-01-01T00:00:00.000Z'),
    expressionType: 'SIMPLE_EXPRESSION'
  },
  {
    id: 2,
    name: 'Test Cohort 2',
    description: 'Another test cohort',
    createdBy: 'test_user',
    createdDate: Date.parse('2024-01-02T00:00:00.000Z'),
    modifiedBy: 'test_user',
    modifiedDate: Date.parse('2024-01-02T00:00:00.000Z'),
    expressionType: 'SIMPLE_EXPRESSION'
  },
  {
    id: 3,
    name: 'Diabetes Cohort',
    description: 'Cohort for diabetes patients',
    createdBy: 'test_user',
    createdDate: Date.parse('2024-01-03T00:00:00.000Z'),
    modifiedBy: 'test_user',
    modifiedDate: Date.parse('2024-01-03T00:00:00.000Z'),
    expressionType: 'SIMPLE_EXPRESSION'
  },
  {
    id: 4,
    name: 'Hypertension Study Cohort',
    description: 'Patients with hypertension for clinical study',
    createdBy: 'researcher',
    createdDate: Date.parse('2024-01-04T00:00:00.000Z'),
    modifiedBy: 'researcher',
    modifiedDate: Date.parse('2024-01-05T00:00:00.000Z'),
    expressionType: 'SIMPLE_EXPRESSION'
  },
  {
    id: 5,
    name: 'Cardiovascular Disease',
    description: 'Patients with any cardiovascular disease',
    createdBy: 'analyst',
    createdDate: Date.parse('2024-01-06T00:00:00.000Z'),
    modifiedBy: 'analyst',
    modifiedDate: Date.parse('2024-01-06T00:00:00.000Z'),
    expressionType: 'SIMPLE_EXPRESSION'
  }
]

/**
 * Empty cohort list for testing no-results state
 */
export const mockCohortsEmpty: MockCohort[] = []

/**
 * Single cohort for detail view testing
 */
export const mockCohortSingle: MockCohort = {
  id: 100,
  name: 'Single Test Cohort',
  description: 'Used for testing single cohort views',
  createdBy: 'test_user',
  createdDate: Date.parse('2024-01-10T00:00:00.000Z'),
  modifiedBy: 'test_user',
  modifiedDate: Date.parse('2024-01-10T00:00:00.000Z'),
  expressionType: 'SIMPLE_EXPRESSION'
}

/**
 * Large cohort list for pagination testing (100 items)
 */
export const mockCohortsLarge: MockCohort[] = Array.from({ length: 100 }, (_, i) => ({
  id: 1000 + i,
  name: `Cohort ${i + 1}`,
  description: `Test cohort number ${i + 1} for pagination testing`,
  createdBy: 'test_user',
  createdDate: Date.parse('2024-01-01T00:00:00.000Z') + i * 86400000, // +1 day each
  modifiedBy: 'test_user',
  modifiedDate: Date.parse('2024-01-01T00:00:00.000Z') + i * 86400000,
  expressionType: 'SIMPLE_EXPRESSION'
}))
