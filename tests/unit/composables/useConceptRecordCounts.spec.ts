import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import type { Concept } from '@/models/concept-set.types'

const getCounts = vi.fn()
vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: (...args: unknown[]) => getCounts(...args),
}))
vi.mock('@/config/webapi', () => ({ getSourceKey: () => '' }))
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({
    getValidVocabularySource: () => 'VOCAB',
    resultsSources: [{ sourceKey: 'RES', sourceName: 'Results' }],
  }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useConceptRecordCounts } from '@/composables/useConceptRecordCounts'

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
  })

  it('fetches counts from the vocabulary source and merges them onto rows', async () => {
    getCounts.mockResolvedValue(new Map([[1, counts(10)]]))
    const items = ref([concept(1), concept(2)])

    const { conceptsWithCounts } = useConceptRecordCounts(items)
    await flushPromises()

    expect(getCounts).toHaveBeenCalledWith('VOCAB', [1, 2])
    expect(conceptsWithCounts.value[0]!.descendantRecordCount).toBe(10)
    expect(conceptsWithCounts.value[1]!.descendantRecordCount).toBeUndefined()
  })

  it('refetches from the chosen source', async () => {
    getCounts.mockResolvedValue(new Map())
    const { setSource, effectiveSourceKey } = useConceptRecordCounts(ref([concept(1)]))
    await flushPromises()

    setSource('RES')
    await flushPromises()

    expect(effectiveSourceKey.value).toBe('RES')
    expect(getCounts).toHaveBeenLastCalledWith('RES', [1])
  })

  it('refetches when the concept list changes and skips an empty list', async () => {
    getCounts.mockResolvedValue(new Map())
    const items = ref<Concept[]>([])
    useConceptRecordCounts(items)
    await flushPromises()
    expect(getCounts).not.toHaveBeenCalled()

    items.value = [concept(5)]
    await flushPromises()
    expect(getCounts).toHaveBeenCalledWith('VOCAB', [5])
  })

  it('keeps the rows and clears loading when the count fetch throws', async () => {
    getCounts.mockRejectedValue(new Error('boom'))
    const items = ref([concept(1)])

    const { conceptsWithCounts, loading } = useConceptRecordCounts(items)
    await flushPromises()

    expect(loading.value).toBe(false)
    expect(conceptsWithCounts.value).toEqual(items.value)
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
