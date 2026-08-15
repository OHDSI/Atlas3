/**
 * Mock cohort data for E2E tests
 * Provides consistent cohort fixtures without requiring real backend
 */

/**
 * WebAPI returns `createdBy`/`modifiedBy` as a user object (or null on legacy
 * rows), never as a bare login string — see the note on
 * CohortGenerationInfoSchema in src/models/webapi.types.ts. The fixtures used
 * to carry a plain string, which meant every consumer (CohortCard.formatUser,
 * CohortTable.formatUser, api-mappers.getLogin) was exercised only on its
 * string branch and the object branch production actually hits went untested.
 */
export interface MockUser {
  id: number
  login: string
  name: string
}

export interface MockCohort {
  id: number
  name: string
  description: string
  createdBy: MockUser
  createdDate: number // Unix timestamp
  modifiedBy: MockUser
  modifiedDate: number // Unix timestamp
  expressionType?: 'SIMPLE' | 'COMPLEX'
}

// `name` deliberately mirrors `login` so the rendered "created by" cell reads
// the same as it did with the old bare-string fixtures — the shape changed,
// the pixels did not, and the visual baselines stay valid.
const testUser: MockUser = { id: 1, login: 'test_user', name: 'test_user' }
const researcher: MockUser = { id: 2, login: 'researcher', name: 'researcher' }
const analyst: MockUser = { id: 3, login: 'analyst', name: 'analyst' }

/**
 * Standard cohort list for general testing
 */
export const mockCohorts: MockCohort[] = [
  {
    id: 1,
    name: 'Test Cohort 1',
    description: 'A test cohort for E2E testing',
    createdBy: testUser,
    createdDate: Date.parse('2024-01-01T00:00:00.000Z'),
    modifiedBy: testUser,
    modifiedDate: Date.parse('2024-01-01T00:00:00.000Z'),
    expressionType: 'SIMPLE'
  },
  {
    id: 2,
    name: 'Test Cohort 2',
    description: 'Another test cohort',
    createdBy: testUser,
    createdDate: Date.parse('2024-01-02T00:00:00.000Z'),
    modifiedBy: testUser,
    modifiedDate: Date.parse('2024-01-02T00:00:00.000Z'),
    expressionType: 'SIMPLE'
  },
  {
    id: 3,
    name: 'Diabetes Cohort',
    description: 'Cohort for diabetes patients',
    createdBy: testUser,
    createdDate: Date.parse('2024-01-03T00:00:00.000Z'),
    modifiedBy: testUser,
    modifiedDate: Date.parse('2024-01-03T00:00:00.000Z'),
    expressionType: 'COMPLEX'
  },
  {
    id: 4,
    name: 'Hypertension Study Cohort',
    description: 'Patients with hypertension for clinical study',
    createdBy: researcher,
    createdDate: Date.parse('2024-01-04T00:00:00.000Z'),
    modifiedBy: researcher,
    modifiedDate: Date.parse('2024-01-05T00:00:00.000Z'),
    expressionType: 'COMPLEX'
  },
  {
    id: 5,
    name: 'Cardiovascular Disease',
    description: 'Patients with any cardiovascular disease',
    createdBy: analyst,
    createdDate: Date.parse('2024-01-06T00:00:00.000Z'),
    modifiedBy: analyst,
    modifiedDate: Date.parse('2024-01-06T00:00:00.000Z'),
    expressionType: 'SIMPLE'
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
  createdBy: testUser,
  createdDate: Date.parse('2024-01-10T00:00:00.000Z'),
  modifiedBy: testUser,
  modifiedDate: Date.parse('2024-01-10T00:00:00.000Z'),
  expressionType: 'SIMPLE'
}

/**
 * Large cohort list for pagination testing (100 items)
 */
export const mockCohortsLarge: MockCohort[] = Array.from({ length: 100 }, (_, i) => ({
  id: 1000 + i,
  name: `Cohort ${i + 1}`,
  description: `Test cohort number ${i + 1} for pagination testing`,
  createdBy: testUser,
  createdDate: Date.parse('2024-01-01T00:00:00.000Z') + i * 86400000, // +1 day each
  modifiedBy: testUser,
  modifiedDate: Date.parse('2024-01-01T00:00:00.000Z') + i * 86400000,
  expressionType: i % 3 === 0 ? 'COMPLEX' : 'SIMPLE'
}))
