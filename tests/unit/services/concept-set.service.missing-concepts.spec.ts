import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

vi.mock('@/services/concept-search.service', () => ({
  getConceptsByIds: vi.fn(),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    executeWithUserRefresh: (operation: () => Promise<unknown>) => operation(),
  })),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({ getValidVocabularySource: () => 'SYNPUF5PCT' }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { httpGet, httpPut } from '@/services/http-client'
import { getConceptsByIds } from '@/services/concept-search.service'
import { getConceptSetById, updateConceptSet } from '@/services/concept-set.service'

const missingConceptsError = () =>
  new ApiError(
    'HTTP 400: Current data source does not contain required concepts (437663)',
    400,
    'Current data source does not contain required concepts (437663)'
  )

const metadata = { id: 7, name: 'Fever', createdDate: '', modifiedDate: '' }

const repositoryItems = [
  { conceptId: 437663, isExcluded: 0, includeDescendants: 1, includeMapped: 0 },
  { conceptId: 201826, isExcluded: 1, includeDescendants: 0, includeMapped: 1 },
]

const resolvedConcept = {
  conceptId: 201826,
  conceptName: 'Type 2 diabetes mellitus',
  conceptCode: '44054006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

function mockGets(expression: () => Promise<unknown>) {
  vi.mocked(httpGet).mockImplementation(async (url: string) => {
    if (url === '/conceptset/7') return metadata
    if (url === '/conceptset/7/expression/SYNPUF5PCT') return expression()
    if (url === '/conceptset/7/items') return repositoryItems
    throw new Error(`unexpected GET ${url}`)
  })
}

describe('concept set loading when the vocabulary lacks some concepts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getConceptsByIds).mockResolvedValue([resolvedConcept])
  })

  it('keeps every item and flags the ones the vocabulary cannot resolve', async () => {
    mockGets(() => Promise.reject(missingConceptsError()))

    const set = await getConceptSetById(7, { rethrow: true })

    expect(getConceptsByIds).toHaveBeenCalledWith('SYNPUF5PCT', [437663, 201826])
    expect(set?.name).toBe('Fever')
    expect(set?.items).toEqual([
      expect.objectContaining({
        conceptId: 437663,
        conceptName: '',
        missingFromVocabulary: true,
        includeDescendants: true,
        isExcluded: false,
      }),
      expect.objectContaining({
        ...resolvedConcept,
        isExcluded: true,
        includeMapped: true,
      }),
    ])
    expect(set?.items[1]).not.toHaveProperty('missingFromVocabulary')
  })

  it('does not fall back for other expression errors', async () => {
    mockGets(() => Promise.reject(new ApiError('HTTP 500: boom', 500, 'boom')))

    await expect(getConceptSetById(7, { rethrow: true })).rejects.toThrow('boom')
    expect(httpGet).not.toHaveBeenCalledWith('/conceptset/7/items')
  })

  it('reloads a saved set with missing concepts instead of failing the save', async () => {
    mockGets(() => Promise.reject(missingConceptsError()))
    vi.mocked(httpPut).mockResolvedValue(true)

    const saved = await updateConceptSet({
      id: 7,
      name: 'Fever',
      items: [],
    })

    expect(saved.items.map(item => item.conceptId)).toEqual([437663, 201826])
  })
})
