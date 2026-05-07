// tests/unit/services/concept-detail.service.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/http-client', () => ({
  httpClient: vi.fn(),
  httpPost: vi.fn(),
}))

import { getConceptRelated } from '@/services/concept-detail.service'
import { httpClient } from '@/services/http-client'
import type { Mock } from 'vitest'

describe('concept-detail.service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getConceptRelated', () => {
    it('fetches related concepts for a source/conceptId and maps to camelCase', async () => {
      ;(httpClient as Mock).mockResolvedValueOnce([
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
      ;(httpClient as Mock).mockResolvedValueOnce([{ broken: true }])
      const result = await getConceptRelated('SYNPUF1K', 1)
      expect(result).toEqual([])
    })
  })
})
