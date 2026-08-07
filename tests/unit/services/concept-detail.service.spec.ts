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
  ConceptDetailServiceError,
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

    it('rejects when validation fails', async () => {
      (httpClient as Mock).mockResolvedValueOnce([{ broken: true }])
      await expect(getConceptRelated('SYNPUF1K', 1)).rejects.toThrow(
        /getConceptRelated response validation failed for SYNPUF1K\/1/
      )
    })

    it('rejects when the HTTP call fails, carrying the underlying cause', async () => {
      const cause = new Error('network error')
      ;(httpClient as Mock).mockRejectedValueOnce(cause)
      await expect(getConceptRelated('SYNPUF1K', 1)).rejects.toBeInstanceOf(
        ConceptDetailServiceError
      )
      ;(httpClient as Mock).mockRejectedValueOnce(cause)
      await expect(getConceptRelated('SYNPUF1K', 1)).rejects.toMatchObject({
        message: 'getConceptRelated request failed for SYNPUF1K/1',
        cause,
      })
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

    it('rejects when the HTTP call fails', async () => {
      (httpClient as Mock).mockRejectedValueOnce(new Error('network error'))
      await expect(getConceptAncestorAndDescendant('SYNPUF1K', 1)).rejects.toThrow(
        /getConceptAncestorAndDescendant request failed for SYNPUF1K\/1/
      )
    })

    it('rejects on validation failure', async () => {
      (httpClient as Mock).mockResolvedValueOnce([{ broken: true }])
      await expect(getConceptAncestorAndDescendant('SYNPUF1K', 1)).rejects.toThrow(
        /getConceptAncestorAndDescendant response validation failed for SYNPUF1K\/1/
      )
    })
  })

  describe('getConceptDrilldown', () => {
    it('returns null when domain is not drillable', async () => {
      const result = await getConceptDrilldown('SYNPUF1K', 'Spec Anatomic Site', 4321)
      expect(result).toBeNull()
      expect(httpClient).not.toHaveBeenCalled()
    })

    it('rejects when the drilldown response fails validation', async () => {
      (httpClient as Mock).mockResolvedValueOnce({ ageAtFirstOccurrence: 'not-an-array' })
      await expect(getConceptDrilldown('SYNPUF1K', 'Condition', 201826)).rejects.toThrow(
        /getConceptDrilldown response validation failed for SYNPUF1K\/201826/
      )
    })

    it('rejects when the drilldown response is not an object', async () => {
      (httpClient as Mock).mockResolvedValueOnce('nope')
      await expect(getConceptDrilldown('SYNPUF1K', 'Condition', 201826)).rejects.toThrow(
        /getConceptDrilldown response validation failed for SYNPUF1K\/201826/
      )
    })

    it('rejects when the drilldown HTTP call rejects', async () => {
      (httpClient as Mock).mockRejectedValueOnce(new Error('boom'))
      await expect(getConceptDrilldown('SYNPUF1K', 'Condition', 201826)).rejects.toThrow(
        /getConceptDrilldown request failed for SYNPUF1K\/201826/
      )
    })

    it('falls back to empty report when drilldown sections are missing', async () => {
      (httpClient as Mock).mockResolvedValueOnce({})
      const result = await getConceptDrilldown('SYNPUF1K', 'Condition', 201826)
      expect(result).not.toBeNull()
      expect(result!.ageAtFirstOccurrence).toBeUndefined()
      expect(result!.prevalenceByMonth).toBeUndefined()
    })

    it('fetches and maps drilldown for a Condition concept', async () => {
      (httpClient as Mock).mockResolvedValueOnce({
        ageAtFirstOccurrence: [
          {
            category: 'MALE',
            minValue: 0,
            p10Value: 35,
            p25Value: 45,
            medianValue: 58,
            p75Value: 70,
            p90Value: 78,
            maxValue: 99,
          },
        ],
        prevalenceByGenderAgeYear: [
          {
            trellisName: '40-49',
            seriesName: 'MALE',
            xCalendarYear: 2010,
            yPrevalence1000Pp: 32.5,
          },
        ],
        prevalenceByMonth: [{ xCalendarMonth: 201001, yPrevalence1000Pp: 12.4 }],
      })

      const result = await getConceptDrilldown('SYNPUF1K', 'Condition', 201826)

      expect(httpClient).toHaveBeenCalledWith('/cdmresults/SYNPUF1K/condition/201826')
      expect(result).not.toBeNull()
      expect(result!.ageAtFirstOccurrence![0].median).toBe(58)
      expect(result!.prevalenceByMonth![0].value).toBe(12.4)
    })
  })
})
