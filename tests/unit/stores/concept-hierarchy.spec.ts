import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/services/concept-detail.service', () => ({
  getConceptAncestorAndDescendant: vi.fn(),
}))

import { useConceptHierarchyStore } from '@/stores/concept-hierarchy'
import { getConceptAncestorAndDescendant } from '@/services/concept-detail.service'
import {
  INFECTIVE_PNEUMONIA_PAYLOAD,
  INFECTIVE_PNEUMONIA_CHILDREN,
} from '../../fixtures/concept-hierarchy'
import type { Mock } from 'vitest'

const mockFetch = getConceptAncestorAndDescendant as Mock

describe('concept-hierarchy store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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
})
