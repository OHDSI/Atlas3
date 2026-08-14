import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useConceptSearchStore } from '@/stores/concept-search'
import { getConceptRecordCounts, searchConcepts } from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({
    getValidVocabularySource: () => 'VOCAB',
    resultsSources: [],
  })),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const concept: Concept = {
  conceptId: 201826,
  conceptName: 'Type 2 diabetes mellitus',
  conceptCode: '44054006',
  domainId: 'Condition',
  vocabularyId: 'SNOMED',
  conceptClassId: 'Clinical Finding',
  standardConcept: 'S',
  invalidReason: null,
}

function counts(recordCount: number) {
  return new Map([
    [
      201826,
      {
        recordCount,
        descendantRecordCount: recordCount * 2,
        personCount: recordCount,
        descendantPersonCount: recordCount * 2,
      },
    ],
  ])
}

/**
 * The vocabulary knows the concepts; only a Results source knows how often
 * they occur. ATLAS 2.x lets the two be chosen separately (#228).
 */
describe('record count source selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  async function searched() {
    (searchConcepts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: [concept],
    })
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(counts(10))

    const store = useConceptSearchStore()
    await store.search('diabetes')
    return store
  }

  it('counts come from the vocabulary source until one is chosen', async () => {
    const store = await searched()

    expect(store.recordCountSourceKey).toBeNull()
    expect(getConceptRecordCounts).toHaveBeenCalledWith('VOCAB', [201826])
    expect(store.allConcepts[0]?.recordCount).toBe(10)
  })

  it('refetches the counts from the chosen source without re-running the search', async () => {
    const store = await searched()
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(counts(99))

    await store.setRecordCountSource('SYNPUF')

    expect(store.recordCountSourceKey).toBe('SYNPUF')
    expect(getConceptRecordCounts).toHaveBeenLastCalledWith('SYNPUF', [201826])
    expect(searchConcepts).toHaveBeenCalledTimes(1)
    expect(store.allConcepts[0]?.recordCount).toBe(99)
    expect(store.allConcepts[0]?.conceptName).toBe('Type 2 diabetes mellitus')
  })

  it('keeps the chosen source for the next search', async () => {
    const store = await searched()
    await store.setRecordCountSource('SYNPUF')
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(counts(5))

    await store.search('hypertension')

    expect(getConceptRecordCounts).toHaveBeenLastCalledWith('SYNPUF', [201826])
  })

  it('keeps the results when the chosen source cannot report counts', async () => {
    const store = await searched()
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('no results daimon')
    )

    await store.setRecordCountSource('BROKEN')

    expect(store.allConcepts).toHaveLength(1)
    expect(store.allConcepts[0]?.conceptName).toBe('Type 2 diabetes mellitus')
    expect(store.error).toBe('Failed to load record counts for the selected source.')
    expect(store.loadingRecordCounts).toBe(false)
  })

  it('does not call the service when there are no results to annotate', async () => {
    const store = useConceptSearchStore()

    await store.setRecordCountSource('SYNPUF')

    expect(getConceptRecordCounts).not.toHaveBeenCalled()
    expect(store.recordCountSourceKey).toBe('SYNPUF')
  })
})
