import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPostRead: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({ useAuthStore: vi.fn(() => ({})) }))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { httpPostRead } from '@/services/http-client'
import { optimizeConceptSet } from '@/services/concept-set.service'
import type { ConceptSetItem } from '@/models/concept-set.types'

const item = (conceptId: number, name: string, flags: Partial<ConceptSetItem> = {}): ConceptSetItem => ({
  conceptId,
  conceptName: name,
  conceptCode: String(conceptId),
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
  isExcluded: false,
  includeDescendants: false,
  includeMapped: false,
  ...flags,
})

const apiItem = (conceptId: number, name: string, includeDescendants: boolean) => ({
  concept: {
    CONCEPT_ID: conceptId,
    CONCEPT_NAME: name,
    CONCEPT_CODE: String(conceptId),
    DOMAIN_ID: 'Condition',
    VOCABULARY_ID: 'SNOMED',
    CONCEPT_CLASS_ID: 'Clinical Finding',
    STANDARD_CONCEPT: 'S',
    INVALID_REASON: 'V',
  },
  isExcluded: false,
  includeDescendants,
  includeMapped: false,
})

describe('optimizeConceptSet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('posts the expression to the vocabulary optimizer and maps both result sets', async () => {
    vi.mocked(httpPostRead).mockResolvedValue({
      optimizedConceptSet: { items: [apiItem(201820, 'Diabetes mellitus', true)] },
      removedConceptSet: { items: [apiItem(201826, 'Type 2 diabetes mellitus', false)] },
    })

    const result = await optimizeConceptSet('SYNPUF1K', [
      item(201820, 'Diabetes mellitus', { includeDescendants: true }),
      item(201826, 'Type 2 diabetes mellitus'),
    ])

    expect(httpPostRead).toHaveBeenCalledWith('/vocabulary/SYNPUF1K/optimize', {
      items: [
        expect.objectContaining({
          concept: expect.objectContaining({ CONCEPT_ID: 201820 }),
          includeDescendants: true,
        }),
        expect.objectContaining({ concept: expect.objectContaining({ CONCEPT_ID: 201826 }) }),
      ],
    })
    expect(result.optimizedItems).toEqual([
      expect.objectContaining({
        conceptId: 201820,
        conceptName: 'Diabetes mellitus',
        includeDescendants: true,
        invalidReason: null,
      }),
    ])
    expect(result.removedItems.map(i => i.conceptId)).toEqual([201826])
  })

  it('treats missing result sets as empty', async () => {
    vi.mocked(httpPostRead).mockResolvedValue({})

    await expect(optimizeConceptSet('SYNPUF1K', [])).resolves.toEqual({
      optimizedItems: [],
      removedItems: [],
    })
  })
})
