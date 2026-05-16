import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/concept-search.service', async (orig) => {
  const real = await orig<typeof import('@/services/concept-search.service')>()
  return {
    ...real,
    resolveConceptSetExpression: vi.fn(),
  }
})

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({
    getValidVocabularySource: () => 'SYNPUF1K',
  }),
}))

import { useConceptSetsStore } from '@/stores/concept-sets'
import { resolveConceptSetExpression } from '@/services/concept-search.service'
import type { ConceptSetItem, Concept } from '@/models/concept-set.types'

const resolveMock = resolveConceptSetExpression as unknown as ReturnType<typeof vi.fn>

function makeItem(id: number, includeDescendants = false): ConceptSetItem {
  return {
    conceptId: id,
    conceptName: `Concept ${id}`,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    isExcluded: false,
    includeDescendants,
    includeMapped: false,
  }
}

function makeConcept(id: number): Concept {
  return {
    conceptId: id,
    conceptName: `Resolved ${id}`,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

describe('concept-sets store — included concepts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    resolveMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('populates includedItems on success', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [makeItem(1, true)] }
    resolveMock.mockResolvedValueOnce([makeConcept(1), makeConcept(2)])

    await store.resolveIncluded('SYNPUF1K')

    expect(store.includedItems).toHaveLength(2)
    expect(store.includedLoading).toBe(false)
    expect(store.includedError).toBeNull()
    expect(store.includedFetchedAt).toBeGreaterThan(0)
  })

  it('short-circuits when there are no items', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [] }
    store.includedItems = [makeConcept(99)] // simulate stale leftovers

    await store.resolveIncluded('SYNPUF1K')

    expect(resolveMock).not.toHaveBeenCalled()
    expect(store.includedItems).toEqual([])
    expect(store.includedError).toBeNull()
  })

  it('keeps previous items and sets error on failure', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [makeItem(1)] }
    store.includedItems = [makeConcept(7)]
    resolveMock.mockRejectedValueOnce(new Error('HTTP 500: boom'))

    await store.resolveIncluded('SYNPUF1K')

    expect(store.includedError).toMatch(/boom/)
    expect(store.includedItems).toEqual([makeConcept(7)])
    expect(store.includedLoading).toBe(false)
  })

  it('aborts the older request when a newer resolve starts', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [makeItem(1)] }

    let firstSignal: AbortSignal | undefined
    resolveMock.mockImplementationOnce(
      (_src, _expr, signal: AbortSignal) =>
        new Promise((_resolve, reject) => {
          firstSignal = signal
          signal.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          )
        }),
    )
    resolveMock.mockResolvedValueOnce([makeConcept(42)])

    const first = store.resolveIncluded('SYNPUF1K')
    const second = store.resolveIncluded('SYNPUF1K')
    await Promise.all([first, second])

    expect(firstSignal?.aborted).toBe(true)
    expect(store.includedItems).toEqual([makeConcept(42)])
    expect(store.includedError).toBeNull()
  })

  it('resetIncluded clears state and aborts in-flight calls', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [makeItem(1)] }

    let signal: AbortSignal | undefined
    resolveMock.mockImplementationOnce(
      (_src, _expr, s: AbortSignal) =>
        new Promise(() => {
          signal = s
        }),
    )
    void store.resolveIncluded('SYNPUF1K')
    expect(store.includedLoading).toBe(true)

    store.resetIncluded()

    expect(signal?.aborted).toBe(true)
    expect(store.includedItems).toEqual([])
    expect(store.includedLoading).toBe(false)
    expect(store.includedError).toBeNull()
    expect(store.includedFetchedAt).toBeNull()
  })

  it('debounces rapid item edits into a single resolve call', async () => {
    const store = useConceptSetsStore()
    resolveMock.mockResolvedValue([makeConcept(1)])

    store.currentSet = { name: 't', items: [makeItem(1)] }
    // Three edits in the same tick:
    store.currentSet.items.push(makeItem(2))
    store.currentSet.items.push(makeItem(3))
    store.currentSet.items[0]!.includeDescendants = true

    // Below the debounce window — nothing should fire yet.
    await vi.advanceTimersByTimeAsync(200)
    expect(resolveMock).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400) // crosses the 500ms threshold
    await Promise.resolve()                // flush microtasks for the action

    expect(resolveMock).toHaveBeenCalledTimes(1)
  })

  it('does not call resolve when items is empty after debounce', async () => {
    const store = useConceptSetsStore()
    store.currentSet = { name: 't', items: [makeItem(1)] }
    resolveMock.mockResolvedValue([makeConcept(1)])

    await vi.advanceTimersByTimeAsync(600)
    await Promise.resolve()
    resolveMock.mockClear()

    store.currentSet.items.splice(0, 1) // now empty
    await vi.advanceTimersByTimeAsync(600)
    await Promise.resolve()

    expect(resolveMock).not.toHaveBeenCalled()
    expect(store.includedItems).toEqual([])
    expect(store.includedFetchedAt).toBeNull()
  })
})
