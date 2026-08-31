/**
 * List-level concept set import (#267). There is no server import endpoint for
 * concept sets, so this parses with the editor's own parser and creates.
 *
 * createConceptSet is exercised for real rather than mocked: it is a sibling
 * export in the same module, and ESM bindings mean a same-module mock of it
 * would never be seen by importConceptSet's internal call. Mocking the
 * transport layer instead (as concept-set.service.spec.ts already does)
 * exercises the real create path and still keeps the test network-free.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn(),
  httpPost: vi.fn(),
  httpPut: vi.fn(),
  httpDelete: vi.fn(),
}))

const mockAuthStore = {
  executeWithUserRefresh: vi.fn((operation: () => Promise<unknown>) => operation()),
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => mockAuthStore),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({ getValidVocabularySource: () => 'demo-source' }),
}))

import { importConceptSet } from '@/services/concept-set.service'
import { httpGet, httpPost, httpPut } from '@/services/http-client'

const CONCEPT = {
  CONCEPT_ID: 1118084,
  CONCEPT_NAME: 'celecoxib',
  CONCEPT_CODE: '140587',
  DOMAIN_ID: 'Drug',
  VOCABULARY_ID: 'RxNorm',
  CONCEPT_CLASS_ID: 'Ingredient',
  STANDARD_CONCEPT: 'S',
  INVALID_REASON: null,
}

const EXPRESSION = {
  items: [{ concept: CONCEPT, isExcluded: false, includeDescendants: true, includeMapped: false }],
}

describe('importConceptSet (#267)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthStore.executeWithUserRefresh.mockImplementation((operation: () => Promise<unknown>) => operation())
    vi.mocked(httpPost).mockResolvedValue({ id: 9 })
    vi.mocked(httpPut).mockResolvedValue(undefined)
    vi.mocked(httpGet)
      .mockResolvedValueOnce({ id: 9, name: 'x' })
      .mockResolvedValueOnce({ items: [] })
  })

  it('names the set from the JSON when it carries a name', async () => {
    await importConceptSet({ name: 'Celecoxib', expression: EXPRESSION }, 'whatever.json')

    expect(httpPost).toHaveBeenCalledWith('/conceptset', expect.objectContaining({ name: 'Celecoxib' }))
  })

  it('falls back to the file name without its extension', async () => {
    await importConceptSet(EXPRESSION, 'NSAIDs of interest.json')

    expect(httpPost).toHaveBeenCalledWith(
      '/conceptset',
      expect.objectContaining({ name: 'NSAIDs of interest' })
    )
  })

  it('falls back to a fixed name when neither is available', async () => {
    await importConceptSet(EXPRESSION, '')

    expect(httpPost).toHaveBeenCalledWith(
      '/conceptset',
      expect.objectContaining({ name: 'Imported concept set' })
    )
  })

  it('carries the parsed items through to the created set', async () => {
    await importConceptSet(EXPRESSION, 'a.json')

    expect(httpPut).toHaveBeenCalledWith('/conceptset/9/items', [
      expect.objectContaining({ conceptId: 1118084, includeDescendants: 1 }),
    ])
  })

  it('rejects with the parser reason and creates nothing when the design has no items', async () => {
    await expect(importConceptSet({ nope: true }, 'a.json')).rejects.toThrow(/items/i)
    expect(httpPost).not.toHaveBeenCalled()
  })
})
