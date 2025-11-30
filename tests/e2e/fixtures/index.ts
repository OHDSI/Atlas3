/**
 * Test fixtures index
 * Re-exports all mock data for easy importing
 */

// Cohort fixtures
export {
  mockCohorts,
  mockCohortsEmpty,
  mockCohortSingle,
  mockCohortsLarge,
  type MockCohort
} from './cohorts'

// Concept fixtures
export {
  mockDiabetesConcepts,
  mockCardiovascularConcepts,
  mockMixedConcepts,
  mockConceptsEmpty,
  createConceptSearchResponse,
  type MockConcept,
  type ConceptSearchResponse
} from './concepts'

// Datasource fixtures
export {
  mockDatasources,
  mockDatasourceSingle,
  mockDashboardReport,
  mockPersonReport,
  type MockDatasource,
  type MockDaimon,
  type MockDashboardReport,
  type MockPersonReport
} from './datasources'

// Report fixtures
export {
  mockReports,
  mockDataDensityReport,
  mockClinicalDomainsReport,
  type MockReport,
  type MockDataDensityReport,
  type MockClinicalDomainsReport
} from './reports'
