/**
 * Mock concept data for E2E tests
 * Provides concept search results for concept-related tests
 */

export interface MockConcept {
  conceptId: number
  conceptName: string
  domainId: string
  vocabularyId: string
  conceptClassId: string
  standardConcept: 'S' | 'C' | null
  conceptCode: string
  validStartDate: string
  validEndDate: string
  invalidReason: string | null
}

/**
 * Diabetes-related concepts for testing
 */
export const mockDiabetesConcepts: MockConcept[] = [
  {
    conceptId: 201826,
    conceptName: 'Type 2 diabetes mellitus',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '44054006',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 443238,
    conceptName: 'Diabetes mellitus',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '73211009',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 435216,
    conceptName: 'Type 1 diabetes mellitus',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '46635009',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 4311629,
    conceptName: 'Insulin',
    domainId: 'Drug',
    vocabularyId: 'RxNorm',
    conceptClassId: 'Ingredient',
    standardConcept: 'S',
    conceptCode: '5856',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 1510202,
    conceptName: 'Metformin',
    domainId: 'Drug',
    vocabularyId: 'RxNorm',
    conceptClassId: 'Ingredient',
    standardConcept: 'S',
    conceptCode: '6809',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  }
]

/**
 * Cardiovascular disease concepts
 */
export const mockCardiovascularConcepts: MockConcept[] = [
  {
    conceptId: 316866,
    conceptName: 'Hypertensive disorder',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '38341003',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 312327,
    conceptName: 'Acute myocardial infarction',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '57054005',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  },
  {
    conceptId: 318443,
    conceptName: 'Heart failure',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: '84114007',
    validStartDate: '1970-01-01',
    validEndDate: '2099-12-31',
    invalidReason: null
  }
]

/**
 * Mixed concept list for general search testing
 */
export const mockMixedConcepts: MockConcept[] = [
  ...mockDiabetesConcepts.slice(0, 3),
  ...mockCardiovascularConcepts.slice(0, 2)
]

/**
 * Empty concept list for no-results testing
 */
export const mockConceptsEmpty: MockConcept[] = []

/**
 * Concept search response with metadata
 */
export interface ConceptSearchResponse {
  content: MockConcept[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

/**
 * Create paginated response from concepts
 */
export function createConceptSearchResponse(
  concepts: MockConcept[],
  pageSize: number = 20,
  pageNumber: number = 0
): ConceptSearchResponse {
  const start = pageNumber * pageSize
  const end = start + pageSize
  const pageConcepts = concepts.slice(start, end)

  return {
    content: pageConcepts,
    totalElements: concepts.length,
    totalPages: Math.ceil(concepts.length / pageSize),
    size: pageSize,
    number: pageNumber
  }
}
