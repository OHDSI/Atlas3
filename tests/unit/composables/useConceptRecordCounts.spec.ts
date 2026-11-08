import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, effectScope, type EffectScope } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Concept } from '@/models/concept-set.types'

const getCounts = vi.fn()
vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: (...args: unknown[]) => getCounts(...args),
}))
vi.mock('@/config/webapi', () => ({ getSourceKey: () => '' }))
// A reactive stand-in for the session's Results selection in the WebAPI store.
vi.mock('@/stores/webapi', async () => {
  const { ref } = await import('vue')
  const selectedResults = ref<string | null>('RESULTS')
  const store = {
    getValidVocabularySource: () => 'VOCAB',
    getValidResultsSource: () => selectedResults.value,
    setResultsSource: vi.fn((key: string | null) => {
      selectedResults.value = key
    }),
    resultsSources: [{ sourceKey: 'RES', sourceName: 'Results' }],
  }
  return { useWebAPIStore: () => store, __selectedResults: selectedResults }
})
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useConceptRecordCounts as useConceptRecordCountsRaw } from '@/composables/useConceptRecordCounts'
import * as webapiModule from '@/stores/webapi'
import type { Ref } from 'vue'

const selectedResults = (webapiModule as unknown as { __selectedResults: Ref<string | null> })
  .__selectedResults

// Run each instance in a scope that is stopped after the test, as a component
// unmount would, so watchers from earlier tests don't react to the shared selection.
let scopes: EffectScope[] = []
function useConceptRecordCounts(items: Ref<Concept[]>) {
  const scope = effectScope()
  scopes.push(scope)
  return scope.run(() => useConceptRecordCountsRaw(items))!
}

const concept = (conceptId: number) => ({ conceptId, conceptName: `c${conceptId}` }) as Concept
const counts = (drc: number) => ({
  recordCount: 1,
  descendantRecordCount: drc,
  personCount: 2,
  descendantPersonCount: 3,
})

describe('useConceptRecordCounts', () => {
  beforeEach(() => {
    getCounts.mockReset()
    selectedResults.value = 'RESULTS'
  })

  afterEach(() => {
    scopes.forEach(s => s.stop())
    scopes = []
  })

  it('fetches counts from the Results source, not the vocabulary source, and merges them onto rows', async () => {
    getCounts.mockResolvedValue(new Map([[1, counts(10)]]))
    const items = ref([concept(1), concept(2)])

    const { conceptsWithCounts } = useConceptRecordCounts(items)
    await flushPromises()

    expect(getCounts).toHaveBeenCalledWith('RESULTS', [1, 2])
    expect(getCounts).not.toHaveBeenCalledWith('VOCAB', expect.anything())
    expect(conceptsWithCounts.value[0]!.descendantRecordCount).toBe(10)
    expect(conceptsWithCounts.value[1]!.descendantRecordCount).toBeUndefined()
  })

  it('does not fall back to the vocabulary source when no Results source exists', async () => {
    selectedResults.value = null
    const { effectiveSourceKey } = useConceptRecordCounts(ref([concept(1)]))
    await flushPromises()

    expect(effectiveSourceKey.value).toBe('')
    expect(getCounts).not.toHaveBeenCalled()
  })

  it('choosing a source in the table changes the shared Results selection and refetches', async () => {
    getCounts.mockResolvedValue(new Map())
    const { setSource, effectiveSourceKey } = useConceptRecordCounts(ref([concept(1)]))
    await flushPromises()

    setSource('RES')
    await flushPromises()

    expect(webapiModule.useWebAPIStore().setResultsSource).toHaveBeenCalledWith('RES')
    expect(selectedResults.value).toBe('RES')
    expect(effectiveSourceKey.value).toBe('RES')
    expect(getCounts).toHaveBeenLastCalledWith('RES', [1])
  })

  it('follows a Results selection made elsewhere (Configuration or another table)', async () => {
    getCounts.mockResolvedValue(new Map())
    const first = useConceptRecordCounts(ref([concept(1)]))
    const second = useConceptRecordCounts(ref([concept(2)]))
    await flushPromises()

    first.setSource('RES')
    await flushPromises()

    expect(second.effectiveSourceKey.value).toBe('RES')
    expect(getCounts).toHaveBeenCalledWith('RES', [2])
  })

  it('refetches when the concept list changes and skips an empty list', async () => {
    getCounts.mockResolvedValue(new Map())
    const items = ref<Concept[]>([])
    useConceptRecordCounts(items)
    await flushPromises()
    expect(getCounts).not.toHaveBeenCalled()

    items.value = [concept(5)]
    await flushPromises()
    expect(getCounts).toHaveBeenCalledWith('RESULTS', [5])
  })

  it('keeps the rows and clears loading when the count fetch throws', async () => {
    getCounts.mockRejectedValue(new Error('boom'))
    const items = ref([concept(1)])

    const { conceptsWithCounts, loading } = useConceptRecordCounts(items)
    await flushPromises()

    expect(loading.value).toBe(false)
    expect(conceptsWithCounts.value).toEqual(items.value)
  })

  it('offers only Results sources and an empty list before sources load', () => {
    const store = webapiModule.useWebAPIStore() as unknown as { resultsSources: unknown }
    const original = store.resultsSources
    const { sources } = useConceptRecordCounts(ref([]))
    expect(sources.value).toEqual([{ sourceKey: 'RES', sourceName: 'Results' }])

    store.resultsSources = undefined
    const { sources: empty } = useConceptRecordCounts(ref([]))
    expect(empty.value).toEqual([])
    store.resultsSources = original
  })

  it('ignores a response that arrives after a newer request', async () => {
    let resolveFirst!: (m: Map<number, ReturnType<typeof counts>>) => void
    getCounts
      .mockReturnValueOnce(new Promise(r => (resolveFirst = r)))
      .mockResolvedValueOnce(new Map([[1, counts(99)]]))

    const { conceptsWithCounts, setSource } = useConceptRecordCounts(ref([concept(1)]))
    setSource('RES')
    await flushPromises()
    resolveFirst(new Map([[1, counts(1)]]))
    await flushPromises()

    expect(conceptsWithCounts.value[0]!.descendantRecordCount).toBe(99)
  })
})
