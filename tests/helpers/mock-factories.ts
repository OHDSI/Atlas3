/**
 * Test Helper: Mock Factories
 * Factory functions for creating consistent test data
 */

import { v4 as uuidv4 } from 'uuid'
import type { CohortEvent, CohortDefinition, ConceptSetReference } from '@/models/cohort.types'
import type { Concept, ConceptSet } from '@/models/concept-set.types'

/**
 * Create a mock CohortEvent with optional overrides
 */
export function createMockCohortEvent(overrides: Partial<CohortEvent> = {}): CohortEvent {
  return {
    id: uuidv4(),
    criteriaType: 'ConditionOccurrence',
    attributes: [],
    ...overrides,
  }
}

/**
 * Create a mock CohortDefinition with optional overrides
 */
export function createMockCohortDefinition(overrides: Partial<CohortDefinition> = {}): CohortDefinition {
  return {
    id: Math.floor(Math.random() * 10000),
    name: 'Test Cohort',
    ...overrides,
  }
}

/**
 * Create a mock Concept with optional overrides
 */
export function createMockConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    conceptId: Math.floor(Math.random() * 1000000),
    conceptName: 'Test Concept',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    conceptCode: String(Math.floor(Math.random() * 1000000)),
    invalidReason: null,
    ...overrides,
  }
}

/**
 * Create a mock ConceptSet with optional overrides
 */
export function createMockConceptSet(overrides: Partial<ConceptSet> = {}): ConceptSet {
  return {
    id: uuidv4(),
    name: 'Test Concept Set',
    items: [],
    ...overrides,
  }
}

/**
 * Create a mock ConceptSetReference with optional overrides
 */
export function createMockConceptSetReference(overrides: Partial<ConceptSetReference> = {}): ConceptSetReference {
  return {
    id: uuidv4(),
    name: 'Test Concept Set',
    ...overrides,
  }
}

/**
 * Create mock CDMSource with optional overrides
 */
export function createMockCDMSource(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    sourceId: Math.floor(Math.random() * 100),
    sourceName: 'Test DataSource',
    sourceDialect: 'postgresql',
    sourceKey: 'TEST_CDM',
    daimons: [],
    ...overrides,
  }
}

/**
 * Create mock WebAPI response for datasource (legacy, kept for compatibility)
 */
export function createMockDataSource(overrides: Record<string, unknown> = {}) {
  return {
    sourceId: Math.floor(Math.random() * 100),
    sourceName: 'Test DataSource',
    sourceDialect: 'postgresql',
    sourceKey: 'TEST_CDM',
    cdmDatabaseSchema: 'cdm',
    vocabDatabaseSchema: 'vocab',
    resultsDatabaseSchema: 'results',
    hasVocabulary: true,
    hasResults: true,
    ...overrides,
  }
}

/**
 * Create mock GenerationJob with optional overrides
 */
export function createMockGenerationJob(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: Math.floor(Math.random() * 10000),
    cohortDefinitionId: Math.floor(Math.random() * 1000),
    sourceKey: 'TEST_CDM',
    status: 'COMPLETE',
    startTime: new Date(Date.now() - 60000).toISOString(),
    endTime: new Date().toISOString(),
    personCount: Math.floor(Math.random() * 10000),
    recordCount: Math.floor(Math.random() * 50000),
    ...overrides,
  }
}

/**
 * Create mock WebAPI response for cohort generation
 */
export function createMockGenerationInfo(overrides: Record<string, unknown> = {}) {
  return {
    id: {
      cohortDefinitionId: Math.floor(Math.random() * 1000),
      sourceId: Math.floor(Math.random() * 100),
    },
    status: 'COMPLETE',
    startTime: Date.now() - 60000,
    endTime: Date.now(),
    personCount: Math.floor(Math.random() * 10000),
    recordCount: Math.floor(Math.random() * 50000),
    ...overrides,
  }
}

/**
 * Create mock fetch response
 */
export function createMockFetchResponse<T>(data: T, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    blob: async () => new Blob([JSON.stringify(data)]),
    arrayBuffer: async () => new ArrayBuffer(0),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as ResponseType,
    url: '',
    clone: function() { return this },
    body: null,
    bodyUsed: false,
  } as Response
}

/**
 * Create mock user/auth data
 */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    id: Math.floor(Math.random() * 1000),
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    permissions: ['cohort:read', 'cohort:write'],
    ...overrides,
  }
}

/**
 * Create mock JWT token (base64 encoded, NOT signed - for testing only)
 */
export function createMockJWT(payload: Record<string, unknown> = {}, expiresInSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const defaultPayload = {
    sub: 'testuser',
    iat: now,
    exp: now + expiresInSeconds,
    ...payload,
  }

  const base64Header = btoa(JSON.stringify(header))
  const base64Payload = btoa(JSON.stringify(defaultPayload))
  const signature = 'test_signature'

  return `${base64Header}.${base64Payload}.${signature}`
}
