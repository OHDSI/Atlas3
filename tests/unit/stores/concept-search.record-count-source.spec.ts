import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia, getActivePinia } from 'pinia'
import { useConceptSearchStore } from '@/stores/concept-search'
import * as webapiModule from '@/stores/webapi'
import { flushPromises } from '@vue/test-utils'
import type { Ref } from 'vue'
import { getConceptRecordCounts, searchConcepts } from '@/services/concept-search.service'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/services/concept-search.service', () => ({
  searchConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
}))

// A reactive stand-in for the session's Results selection in the WebAPI store.
vi.mock('@/stores/webapi', async () => {
  const { ref } = await import('vue')
  const selectedResults = ref<string | null>(null)
  const store = {
    getValidVocabularySource: () => 'VOCAB',
    getValidResultsSource: () => selectedResults.value ?? 'RESULTS',
    setResultsSource: vi.fn((key: string | null) => {
      selectedResults.value = key
    }),
    resultsSources: [],
  }
  return { useWebAPIStore: vi.fn(() => store), __selectedResults: selectedResults }
})

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
  const selectedResults = (webapiModule as unknown as { __selectedResults: Ref<string | null> })
    .__selectedResults
  const webapiStore = () => webapiModule.useWebAPIStore()

  beforeEach(() => {
    getActivePinia()?._s.forEach(s => s.$dispose())
    setActivePinia(createPinia())
    vi.clearAllMocks()
    selectedResults.value = null
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

  it('counts come from the session Results selection, not the vocabulary source', async () => {
    const store = await searched()

    expect(store.recordCountSourceKey).toBe('RESULTS')
    expect(searchConcepts).toHaveBeenCalledWith('VOCAB', 'diabetes')
    expect(getConceptRecordCounts).toHaveBeenCalledWith('RESULTS', [201826])
    expect(store.allConcepts[0]?.recordCount).toBe(10)
  })

  it('choosing a source in the table changes the shared Results selection', async () => {
    const store = await searched()

    await store.setRecordCountSource('SYNPUF')

    expect(webapiStore().setResultsSource).toHaveBeenCalledWith('SYNPUF')
    expect(selectedResults.value).toBe('SYNPUF')
  })

  it('refreshes the counts once when the Results selection changes elsewhere', async () => {
    const store = await searched()
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockClear()
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(counts(42))

    webapiStore().setResultsSource('OTHER')
    await flushPromises()

    expect(store.recordCountSourceKey).toBe('OTHER')
    expect(getConceptRecordCounts).toHaveBeenCalledTimes(1)
    expect(getConceptRecordCounts).toHaveBeenCalledWith('OTHER', [201826])
    expect(store.allConcepts[0]?.recordCount).toBe(42)
  })

  it('does not refetch twice when the table picker changes the selection', async () => {
    const store = await searched()
    ;(getConceptRecordCounts as unknown as ReturnType<typeof vi.fn>).mockClear()

    await store.setRecordCountSource('SYNPUF')
    await flushPromises()

    expect(getConceptRecordCounts).toHaveBeenCalledTimes(1)
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

  it('shows the concepts without counts when no Results source is available', async () => {
    const ws = webapiStore() as unknown as { getValidResultsSource: () => string | null }
    const original = ws.getValidResultsSource
    ws.getValidResultsSource = () => null
    try {
      (searchConcepts as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: [concept],
      })
      const store = useConceptSearchStore()
      await store.search('diabetes')

      expect(store.allConcepts).toHaveLength(1)
      expect(store.allConcepts[0]?.recordCount).toBeUndefined()
      expect(getConceptRecordCounts).not.toHaveBeenCalled()
    } finally {
      ws.getValidResultsSource = original
    }
  })
})
