import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/concept-detail.service', () => ({
  fetchConceptAncestorAndDescendant: vi.fn(),
}))

vi.mock('@/services/concept-search.service', () => ({
  getConceptRecordCounts: vi.fn(),
}))

import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import { fetchConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import { getConceptRecordCounts } from '@/services/concept-search.service'
import {
  INFECTIVE_PNEUMONIA_PAYLOAD,
  INFECTIVE_PNEUMONIA_CHILDREN,
} from '../../fixtures/concept-hierarchy'
import type { Mock } from 'vitest'

const mockFetch = fetchConceptAncestorAndDescendant as Mock
const mockCounts = getConceptRecordCounts as Mock

describe('concept-hierarchy store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockCounts.mockResolvedValue(new Map())
  })

  it('keeps only distance-1 descendants when expanding a node', async () => {
    mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await store.expandNode(443410)

    const children = store.childrenOf(443410)
    expect(children).toHaveLength(INFECTIVE_PNEUMONIA_CHILDREN.length)
    expect(children.map(c => c.conceptId)).not.toContain(255848)
    expect(children.map(c => c.conceptId)).not.toContain(4139520)
  })

  it('does not refetch a node that is already cached', async () => {
    mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await store.expandNode(443410)
    store.collapseNode(443410)
    await store.expandNode(443410)

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('does not issue a second request while one is in flight', async () => {
    mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await Promise.all([store.expandNode(443410), store.expandNode(443410)])

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('marks a node with no descendants as a leaf', async () => {
    mockFetch.mockResolvedValue([])
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await store.expandNode(4025165)

    expect(store.isLeaf(4025165)).toBe(true)
    expect(store.isExpanded(4025165)).toBe(false)
  })

  it('isolates a failed node without disturbing others', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await store.expandNode(4025165)
    await store.expandNode(443410)

    expect(store.hasFailed(4025165)).toBe(true)
    expect(store.isLoading(4025165)).toBe(false)
    expect(store.childrenOf(443410)).toHaveLength(INFECTIVE_PNEUMONIA_CHILDREN.length)
  })

  it('allows retrying a failed node', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')

    await store.expandNode(443410)
    await store.expandNode(443410)

    expect(store.hasFailed(443410)).toBe(false)
    expect(store.childrenOf(443410)).toHaveLength(INFECTIVE_PNEUMONIA_CHILDREN.length)
  })

  it('clears everything when the source changes', async () => {
    mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')
    await store.expandNode(443410)

    store.setSource('SYNPUF5PCT')

    expect(store.childrenOf(443410)).toEqual([])
    expect(store.isExpanded(443410)).toBe(false)
  })

  it('reset clears cache and expansion state', async () => {
    mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')
    await store.expandNode(443410)

    store.reset()

    expect(store.childrenOf(443410)).toEqual([])
    expect(store.isExpanded(443410)).toBe(false)
  })

  it('discards stale results when source changes before fetch completes', async () => {
    let resolvePayload: (value: typeof INFECTIVE_PNEUMONIA_PAYLOAD) => void
    const deferredPromise = new Promise<typeof INFECTIVE_PNEUMONIA_PAYLOAD>(
      (resolve) => {
        resolvePayload = resolve
      }
    )
    mockFetch.mockReturnValueOnce(deferredPromise)

    const store = useConceptHierarchyStore()
    store.setSource('SYNPUF1K')
    const expandPromise = store.expandNode(443410)

    store.setSource('SYNPUF5PCT')
    resolvePayload!(INFECTIVE_PNEUMONIA_PAYLOAD)
    await expandPromise

    expect(store.childrenOf(443410)).toEqual([])
    expect(store.isExpanded(443410)).toBe(false)
  })

  describe('record counts', () => {
    it('fetches counts for the children an expansion produced', async () => {
      mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
      mockCounts.mockResolvedValue(
        new Map([
          [257315, { recordCount: 2880, descendantRecordCount: 12441, personCount: 900, descendantPersonCount: 4000 }],
        ])
      )
      const store = useConceptHierarchyStore()
      store.setSource('SYNPUF1K')

      await store.expandNode(443410)

      expect(mockCounts).toHaveBeenCalledWith(
        'SYNPUF1K',
        expect.arrayContaining([257315, 261326])
      )
      expect(store.countsFor(257315)?.recordCount).toBe(2880)
    })

    it('leaves the tree usable when the counts call fails', async () => {
      mockFetch.mockResolvedValue(INFECTIVE_PNEUMONIA_PAYLOAD)
      mockCounts.mockRejectedValue(new Error('counts down'))
      const store = useConceptHierarchyStore()
      store.setSource('SYNPUF1K')

      await store.expandNode(443410)

      expect(store.childrenOf(443410)).toHaveLength(INFECTIVE_PNEUMONIA_CHILDREN.length)
      expect(store.hasFailed(443410)).toBe(false)
      expect(store.countsFor(257315)).toBeUndefined()
    })

    it('does not call the counts endpoint with an empty id list', async () => {
      mockFetch.mockResolvedValue([])
      const store = useConceptHierarchyStore()
      store.setSource('SYNPUF1K')

      await store.expandNode(4025165)

      expect(mockCounts).not.toHaveBeenCalled()
    })

    it('discards a stale counts response after a source switch', async () => {
      let resolveFetch: (value: typeof INFECTIVE_PNEUMONIA_PAYLOAD) => void
      const fetchPromise = new Promise<typeof INFECTIVE_PNEUMONIA_PAYLOAD>(resolve => {
        resolveFetch = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      let resolveCounts: (
        value: Map<
          number,
          { recordCount: number; descendantRecordCount: number; personCount: number; descendantPersonCount: number }
        >
      ) => void
      const countsPromise = new Promise<
        Map<
          number,
          { recordCount: number; descendantRecordCount: number; personCount: number; descendantPersonCount: number }
        >
      >(resolve => {
        resolveCounts = resolve
      })
      mockCounts.mockReturnValueOnce(countsPromise)

      const store = useConceptHierarchyStore()
      store.setSource('SYNPUF1K')
      const expandPromise = store.expandNode(443410)

      resolveFetch!(INFECTIVE_PNEUMONIA_PAYLOAD)
      await vi.waitFor(() => expect(mockCounts).toHaveBeenCalled())

      store.setSource('SYNPUF5PCT')
      resolveCounts!(
        new Map([
          [257315, { recordCount: 2880, descendantRecordCount: 12441, personCount: 900, descendantPersonCount: 4000 }],
        ])
      )
      await expandPromise

      expect(store.countsFor(257315)).toBeUndefined()
    })
  })
})
