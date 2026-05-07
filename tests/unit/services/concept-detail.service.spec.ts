// tests/unit/services/concept-detail.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/http-client', () => ({
  httpClient: vi.fn(),
  httpPost: vi.fn(),
}))

import {
  getConceptRelated,
  getConceptAncestorAndDescendant,
  getConceptDrilldown,
} from '@/services/concept-detail.service'
import { httpClient } from '@/services/http-client'
import type { Mock } from 'vitest'

describe('concept-detail.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConceptRelated', () => {
    it('fetches related concepts for a source/conceptId and maps to camelCase', async () => {
      (httpClient as Mock).mockResolvedValueOnce([
        {
          CONCEPT_ID: 73211009,
          CONCEPT_NAME: 'Diabetes mellitus',
          CONCEPT_CODE: '73211009',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
          RELATIONSHIPS: [{ RELATIONSHIP_NAME: 'Is a', RELATIONSHIP_DISTANCE: 1 }],
        },
      ])

      const result = await getConceptRelated('SYNPUF1K', 201826)

      expect(httpClient).toHaveBeenCalledWith('/vocabulary/SYNPUF1K/concept/201826/related')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        conceptId: 73211009,
        conceptName: 'Diabetes mellitus',
        relationships: [{ relationshipName: 'Is a', relationshipDistance: 1 }],
      })
    })

    it('returns [] and logs error when validation fails', async () => {
      (httpClient as Mock).mockResolvedValueOnce([{ broken: true }])
      const result = await getConceptRelated('SYNPUF1K', 1)
      expect(result).toEqual([])
    })
  })

  describe('getConceptAncestorAndDescendant', () => {
    it('fetches the flat ancestor+descendant list', async () => {
      (httpClient as Mock).mockResolvedValueOnce([
        {
          CONCEPT_ID: 73211009,
          CONCEPT_NAME: 'Diabetes mellitus',
          CONCEPT_CODE: '73211009',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
          RELATIONSHIPS: [{ RELATIONSHIP_NAME: 'Has ancestor of', RELATIONSHIP_DISTANCE: 1 }],
        },
      ])

      const result = await getConceptAncestorAndDescendant('SYNPUF1K', 201826)

      expect(httpClient).toHaveBeenCalledWith(
        '/vocabulary/SYNPUF1K/concept/201826/ancestorAndDescendant'
      )
      expect(result).toHaveLength(1)
      expect(result[0].relationships[0].relationshipName).toBe('Has ancestor of')
    })
  })

  describe('getConceptDrilldown', () => {
    it('returns null when domain is not drillable', async () => {
      const result = await getConceptDrilldown('SYNPUF1K', 'Spec Anatomic Site', 4321)
      expect(result).toBeNull()
      expect(httpClient).not.toHaveBeenCalled()
    })

    it('fetches and maps drilldown for a Condition concept', async () => {
      ;(httpClient as Mock).mockResolvedValueOnce({
        AGE_AT_FIRST_OCCURRENCE: [
          {
            CATEGORY: 'MALE',
            MIN_VALUE: 0,
            P10_VALUE: 35,
            P25_VALUE: 45,
            MEDIAN_VALUE: 58,
            P75_VALUE: 70,
            P90_VALUE: 78,
            MAX_VALUE: 99,
          },
        ],
        PREVALENCE_BY_GENDER_AGE_YEAR: [
          {
            TRELLIS_NAME: '40-49',
            SERIES_NAME: 'MALE',
            X_CALENDAR_YEAR: 2010,
            Y_PREVALENCE_1000PP: 32.5,
          },
        ],
        PREVALENCE_BY_MONTH: [{ X_CALENDAR_MONTH: 201001, Y_PREVALENCE_1000PP: 12.4 }],
      })

      const result = await getConceptDrilldown('SYNPUF1K', 'Condition', 201826)

      expect(httpClient).toHaveBeenCalledWith('/cdmresults/SYNPUF1K/condition/201826')
      expect(result).not.toBeNull()
      expect(result!.ageAtFirstOccurrence[0].medianValue).toBe(58)
      expect(result!.prevalenceByGenderAgeYear[0].calendarYear).toBe(2010)
      expect(result!.prevalenceByMonth[0].calendarMonth).toBe(201001)
    })
  })
})
