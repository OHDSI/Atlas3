/**
 * API Mappers Utility Tests
 * Tests for WebAPI response conversion
 */
import { describe, it, expect } from 'vitest'
import {
  mapConceptFromAPI,
  conceptToConceptSetItem,
  mapConceptSetFromAPI,
  mapConceptSetToAPI,
  normalizeInvalidReason,
  type ConceptSetAPIResponse
} from '@/utils/api-mappers'
import type { Concept, ConceptSet } from '@/models/concept-set.types'

describe('API Mappers', () => {
  describe('mapConceptFromAPI', () => {
    it('should map UPPERCASE API response to camelCase', () => {
      const apiConcept = {
        CONCEPT_ID: 123,
        CONCEPT_NAME: 'Test Condition',
        CONCEPT_CODE: 'T001',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'SNOMED',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: null
      }

      const result = mapConceptFromAPI(apiConcept)

      expect(result.conceptId).toBe(123)
      expect(result.conceptName).toBe('Test Condition')
      expect(result.conceptCode).toBe('T001')
      expect(result.domainId).toBe('Condition')
      expect(result.vocabularyId).toBe('SNOMED')
      expect(result.conceptClassId).toBe('Clinical Finding')
      expect(result.standardConcept).toBe('S')
      expect(result.invalidReason).toBeNull()
    })

    it('should handle null STANDARD_CONCEPT', () => {
      const apiConcept = {
        CONCEPT_ID: 1,
        CONCEPT_NAME: 'Test',
        CONCEPT_CODE: 'T1',
        DOMAIN_ID: 'Drug',
        VOCABULARY_ID: 'RxNorm',
        CONCEPT_CLASS_ID: 'Ingredient',
        STANDARD_CONCEPT: null,
        INVALID_REASON: 'D'
      }

      const result = mapConceptFromAPI(apiConcept)

      expect(result.standardConcept).toBeNull()
      expect(result.invalidReason).toBe('D')
    })
  })

  describe('conceptToConceptSetItem', () => {
    it('should add default flags to concept', () => {
      const concept: Concept = {
        conceptId: 123,
        conceptName: 'Test',
        conceptCode: 'T1',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null
      }

      const result = conceptToConceptSetItem(concept)

      expect(result.isExcluded).toBe(false)
      expect(result.includeDescendants).toBe(false)
      expect(result.includeMapped).toBe(false)
    })

    it('should use provided options', () => {
      const concept: Concept = {
        conceptId: 123,
        conceptName: 'Test',
        conceptCode: 'T1',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null
      }

      const result = conceptToConceptSetItem(concept, {
        isExcluded: true,
        includeDescendants: true,
        includeMapped: true
      })

      expect(result.isExcluded).toBe(true)
      expect(result.includeDescendants).toBe(true)
      expect(result.includeMapped).toBe(true)
    })

    it('should preserve concept properties', () => {
      const concept: Concept = {
        conceptId: 456,
        conceptName: 'Diabetes',
        conceptCode: 'DM',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null
      }

      const result = conceptToConceptSetItem(concept)

      expect(result.conceptId).toBe(456)
      expect(result.conceptName).toBe('Diabetes')
    })
  })

  describe('mapConceptSetFromAPI', () => {
    it('should map full API response to ConceptSet', () => {
      const apiResponse: ConceptSetAPIResponse = {
        id: 100,
        name: 'My Concept Set',
        createdDate: '2024-01-15',
        createdBy: { id: 1, name: 'User One', login: 'user1' },
        modifiedDate: '2024-06-01',
        modifiedBy: 'user2',
        shared: true,
        expression: {
          items: [
            {
              concept: {
                CONCEPT_ID: 123,
                CONCEPT_NAME: 'Test Concept',
                CONCEPT_CODE: 'TC',
                DOMAIN_ID: 'Condition',
                VOCABULARY_ID: 'SNOMED',
                CONCEPT_CLASS_ID: 'Finding',
                STANDARD_CONCEPT: 'S',
                INVALID_REASON: null
              },
              isExcluded: false,
              includeDescendants: true,
              includeMapped: false
            }
          ]
        }
      }

      const result = mapConceptSetFromAPI(apiResponse)

      expect(result.id).toBe(100)
      expect(result.name).toBe('My Concept Set')
      expect(result.createdBy).toBe('user1')
      expect(result.modifiedBy).toBe('user2')
      expect(result.shared).toBe(true)
      expect(result.items).toHaveLength(1)
      expect(result.items[0].conceptId).toBe(123)
      expect(result.items[0].includeDescendants).toBe(true)
    })

    it('should handle string user values', () => {
      const apiResponse: ConceptSetAPIResponse = {
        id: 1,
        name: 'Test',
        createdBy: 'admin',
        modifiedBy: 'admin'
      }

      const result = mapConceptSetFromAPI(apiResponse)

      expect(result.createdBy).toBe('admin')
      expect(result.modifiedBy).toBe('admin')
    })

    it('should default to empty items when no expression', () => {
      const apiResponse: ConceptSetAPIResponse = {
        id: 1,
        name: 'Empty Set'
      }

      const result = mapConceptSetFromAPI(apiResponse)

      expect(result.items).toEqual([])
    })

    it('should default shared to false', () => {
      const apiResponse: ConceptSetAPIResponse = {
        id: 1,
        name: 'Test'
      }

      const result = mapConceptSetFromAPI(apiResponse)

      expect(result.shared).toBe(false)
    })

    it('should normalize the "V" (valid) sentinel to null so valid concepts are not flagged as invalid (#221)', () => {
      const apiResponse: ConceptSetAPIResponse = {
        id: 1,
        name: 'Test',
        expression: {
          items: [
            {
              concept: {
                CONCEPT_ID: 8560,
                CONCEPT_NAME: 'Valid Concept',
                CONCEPT_CODE: 'VC',
                DOMAIN_ID: 'Condition',
                VOCABULARY_ID: 'SNOMED',
                CONCEPT_CLASS_ID: 'Finding',
                STANDARD_CONCEPT: 'S',
                INVALID_REASON: 'V'
              },
              isExcluded: false,
              includeDescendants: false,
              includeMapped: false
            }
          ]
        }
      }

      const result = mapConceptSetFromAPI(apiResponse)

      expect(result.items[0].invalidReason).toBeNull()
    })
  })

  describe('normalizeInvalidReason', () => {
    it('should treat the "V" sentinel as valid (null)', () => {
      expect(normalizeInvalidReason('V')).toBeNull()
    })

    it('should treat null/undefined as valid (null)', () => {
      expect(normalizeInvalidReason(null)).toBeNull()
      expect(normalizeInvalidReason(undefined)).toBeNull()
    })

    it('should pass through a real invalid reason unchanged', () => {
      expect(normalizeInvalidReason('D')).toBe('D')
      expect(normalizeInvalidReason('U')).toBe('U')
    })
  })

  describe('mapConceptSetToAPI', () => {
    it('should map ConceptSet to API format', () => {
      const conceptSet: ConceptSet = {
        id: 100,
        name: 'Test Set',
        shared: true,
        items: [
          {
            conceptId: 123,
            conceptName: 'Test',
            conceptCode: 'T1',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Finding',
            standardConcept: 'S',
            invalidReason: null,
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false
          }
        ]
      }

      const result = mapConceptSetToAPI(conceptSet)

      expect(result.id).toBe(100)
      expect(result.name).toBe('Test Set')
      expect(result.shared).toBe(true)
      expect(result.expression.items).toHaveLength(1)
      expect(result.expression.items[0].concept.CONCEPT_ID).toBe(123)
      expect(result.expression.items[0].concept.CONCEPT_NAME).toBe('Test')
      expect(result.expression.items[0].includeDescendants).toBe(true)
    })

    it('should omit id when not a number', () => {
      const conceptSet: ConceptSet = {
        id: 'temp-id' as any, // Non-numeric ID
        name: 'New Set',
        items: []
      }

      const result = mapConceptSetToAPI(conceptSet)

      expect(result.id).toBeUndefined()
    })

    it('should handle empty items', () => {
      const conceptSet: ConceptSet = {
        id: 1,
        name: 'Empty',
        items: []
      }

      const result = mapConceptSetToAPI(conceptSet)

      expect(result.expression.items).toHaveLength(0)
    })
  })
})
