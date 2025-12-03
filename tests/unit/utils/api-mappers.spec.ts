/**
 * Unit Tests: API Mappers
 * Tests for src/utils/api-mappers.ts
 */

import { describe, it, expect } from 'vitest'
import {
  mapConceptFromAPI,
  conceptToConceptSetItem,
  mapConceptSetFromAPI,
  mapConceptSetToAPI,
} from '@/utils/api-mappers'

describe('api-mappers', () => {
  describe('mapConceptFromAPI', () => {
    it('maps uppercase API fields to camelCase', () => {
      const raw = {
        CONCEPT_ID: 123,
        CONCEPT_NAME: 'Test Concept',
        CONCEPT_CODE: 'TC001',
        DOMAIN_ID: 'Condition',
        VOCABULARY_ID: 'SNOMED',
        CONCEPT_CLASS_ID: 'Clinical Finding',
        STANDARD_CONCEPT: 'S',
        INVALID_REASON: null,
      }

      const result = mapConceptFromAPI(raw)

      expect(result).toEqual({
        conceptId: 123,
        conceptName: 'Test Concept',
        conceptCode: 'TC001',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
      })
    })

    it('preserves null values', () => {
      const raw = {
        CONCEPT_ID: 456,
        CONCEPT_NAME: 'Another Concept',
        CONCEPT_CODE: 'AC002',
        DOMAIN_ID: 'Drug',
        VOCABULARY_ID: 'RxNorm',
        CONCEPT_CLASS_ID: 'Ingredient',
        STANDARD_CONCEPT: null,
        INVALID_REASON: 'D',
      }

      const result = mapConceptFromAPI(raw)

      expect(result.standardConcept).toBeNull()
      expect(result.invalidReason).toBe('D')
    })
  })

  describe('conceptToConceptSetItem', () => {
    const concept = {
      conceptId: 123,
      conceptName: 'Test',
      conceptCode: 'T001',
      domainId: 'Condition',
      vocabularyId: 'SNOMED',
      conceptClassId: 'Clinical Finding',
      standardConcept: 'S',
      invalidReason: null,
    }

    it('creates concept set item with default flags', () => {
      const result = conceptToConceptSetItem(concept)

      expect(result).toEqual({
        ...concept,
        isExcluded: false,
        includeDescendants: false,
        includeMapped: false,
      })
    })

    it('applies custom options', () => {
      const result = conceptToConceptSetItem(concept, {
        isExcluded: true,
        includeDescendants: true,
        includeMapped: true,
      })

      expect(result.isExcluded).toBe(true)
      expect(result.includeDescendants).toBe(true)
      expect(result.includeMapped).toBe(true)
    })

    it('applies partial options', () => {
      const result = conceptToConceptSetItem(concept, {
        includeDescendants: true,
      })

      expect(result.isExcluded).toBe(false)
      expect(result.includeDescendants).toBe(true)
      expect(result.includeMapped).toBe(false)
    })
  })

  describe('mapConceptSetFromAPI', () => {
    it('maps concept set metadata', () => {
      const raw = {
        id: 1,
        name: 'Test Set',
        createdDate: '2024-01-01T00:00:00Z',
        createdBy: 'user1',
        modifiedDate: '2024-01-02T00:00:00Z',
        modifiedBy: 'user2',
        shared: true,
      }

      const result = mapConceptSetFromAPI(raw)

      expect(result.id).toBe(1)
      expect(result.name).toBe('Test Set')
      expect(result.createdDate).toBe('2024-01-01T00:00:00Z')
      expect(result.createdBy).toBe('user1')
      expect(result.modifiedDate).toBe('2024-01-02T00:00:00Z')
      expect(result.modifiedBy).toBe('user2')
      expect(result.shared).toBe(true)
      expect(result.items).toEqual([])
    })

    it('extracts login from user object', () => {
      const raw = {
        id: 2,
        name: 'Test Set 2',
        createdBy: { id: 1, name: 'John Doe', login: 'jdoe' },
        modifiedBy: { id: 2, name: null, login: 'admin' },
      }

      const result = mapConceptSetFromAPI(raw)

      expect(result.createdBy).toBe('jdoe')
      expect(result.modifiedBy).toBe('admin')
    })

    it('maps expression items', () => {
      const raw = {
        id: 3,
        name: 'Set with Items',
        expression: {
          items: [
            {
              concept: {
                CONCEPT_ID: 123,
                CONCEPT_NAME: 'Test Concept',
                CONCEPT_CODE: 'TC001',
                DOMAIN_ID: 'Condition',
                VOCABULARY_ID: 'SNOMED',
                CONCEPT_CLASS_ID: 'Clinical Finding',
                STANDARD_CONCEPT: 'S',
                INVALID_REASON: null,
              },
              isExcluded: false,
              includeDescendants: true,
              includeMapped: false,
            },
          ],
        },
      }

      const result = mapConceptSetFromAPI(raw)

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toEqual({
        conceptId: 123,
        conceptName: 'Test Concept',
        conceptCode: 'TC001',
        domainId: 'Condition',
        vocabularyId: 'SNOMED',
        conceptClassId: 'Clinical Finding',
        standardConcept: 'S',
        invalidReason: null,
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      })
    })

    it('handles missing optional fields', () => {
      const raw = {
        id: 4,
        name: 'Minimal Set',
      }

      const result = mapConceptSetFromAPI(raw)

      expect(result.createdBy).toBeUndefined()
      expect(result.modifiedBy).toBeUndefined()
      expect(result.shared).toBe(false)
      expect(result.items).toEqual([])
    })
  })

  describe('mapConceptSetToAPI', () => {
    it('maps concept set to API format', () => {
      const conceptSet = {
        id: 1,
        name: 'Test Set',
        shared: true,
        items: [
          {
            conceptId: 123,
            conceptName: 'Test Concept',
            conceptCode: 'TC001',
            domainId: 'Condition',
            vocabularyId: 'SNOMED',
            conceptClassId: 'Clinical Finding',
            standardConcept: 'S' as const,
            invalidReason: null,
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      }

      const result = mapConceptSetToAPI(conceptSet)

      expect(result.id).toBe(1)
      expect(result.name).toBe('Test Set')
      expect(result.shared).toBe(true)
      expect(result.expression.items).toHaveLength(1)
      expect(result.expression.items[0]).toEqual({
        concept: {
          CONCEPT_ID: 123,
          CONCEPT_NAME: 'Test Concept',
          CONCEPT_CODE: 'TC001',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
        },
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false,
      })
    })

    it('handles new concept set without id', () => {
      const conceptSet = {
        name: 'New Set',
        items: [],
      }

      const result = mapConceptSetToAPI(conceptSet as never)

      expect(result.id).toBeUndefined()
      expect(result.name).toBe('New Set')
      expect(result.expression.items).toEqual([])
    })
  })
})
