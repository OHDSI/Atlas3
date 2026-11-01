import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type {
  ComparisonResultItem,
  Concept,
  ConceptSet,
  ConceptSetItem,
  ConceptSetListItem,
} from '@/models/concept-set.types'

vi.mock('@/services/concept-set.service', () => ({
  getAllConceptSets: vi.fn(),
  getConceptSetById: vi.fn(),
  createConceptSet: vi.fn(),
  updateConceptSet: vi.fn(),
  deleteConceptSet: vi.fn(),
  assignTagToConceptSet: vi.fn(),
  unassignTagFromConceptSet: vi.fn(),
}))

vi.mock('@/services/concept-search.service', () => ({
  getRecommendedConcepts: vi.fn(),
  getConceptRecordCounts: vi.fn(),
  compareConceptSets: vi.fn(),
  getMappedSourceCodes: vi.fn(),
  resolveConceptSetExpression: vi.fn(),
}))

vi.mock('@/services/concept-set-versions.service', () => ({
  getVersion: vi.fn(),
}))

const vocabularySource = vi.fn<() => string | null>(() => 'WEBAPI_VOCAB')
vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: () => ({ getValidVocabularySource: vocabularySource }),
}))

const defaultSourceKey = vi.fn<() => string>(() => 'DEFAULT_KEY')
vi.mock('@/config/webapi', async (orig) => ({
  ...(await orig<typeof import('@/config/webapi')>()),
  getSourceKey: () => defaultSourceKey(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useConceptSetsStore } from '@/stores/concept-sets'
import {
  getAllConceptSets,
  getConceptSetById,
  createConceptSet,
  updateConceptSet,
  deleteConceptSet,
  assignTagToConceptSet,
  unassignTagFromConceptSet,
} from '@/services/concept-set.service'
import {
  compareConceptSets,
  getMappedSourceCodes,
  resolveConceptSetExpression,
} from '@/services/concept-search.service'
import { getVersion } from '@/services/concept-set-versions.service'

function concept(id: number, name = `Concept ${id}`): Concept {
  return {
    conceptId: id,
    conceptName: name,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

function item(id: number, flags: Partial<ConceptSetItem> = {}): ConceptSetItem {
  return {
    ...concept(id),
    isExcluded: false,
    includeDescendants: false,
    includeMapped: false,
    ...flags,
  }
}

function set(id: number, items: ConceptSetItem[] = [item(1)], name = `Set ${id}`): ConceptSet {
  return { id, name, items }
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  let reject: (reason: unknown) => void = () => {}
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function abortError(): Error {
  const err = new Error('aborted')
  err.name = 'AbortError'
  return err
}

describe('concept-sets store behaviors', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
    vocabularySource.mockReturnValue('WEBAPI_VOCAB')
    defaultSourceKey.mockReturnValue('DEFAULT_KEY')
    vi.mocked(getAllConceptSets).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initial state and getters', () => {
    it('registers under the concept-sets id with idle included and source-code state', () => {
      const store = useConceptSetsStore()
      expect(store.$id).toBe('concept-sets')
      expect(store.includedLoading).toBe(false)
      expect(store.sourceCodeItems).toEqual([])
    })

    it('lists authors alphabetically', () => {
      const store = useConceptSetsStore()
      store.conceptSets = [
        { id: 1, name: 'a', createdBy: 'zed' },
        { id: 2, name: 'b', createdBy: 'amy' },
        { id: 3, name: 'c', createdBy: 'mia' },
      ] as ConceptSetListItem[]
      expect(store.availableAuthors).toEqual(['amy', 'mia', 'zed'])
    })

    it('counts a tag selection as one active filter', () => {
      const store = useConceptSetsStore()
      expect(store.activeFilterCount).toBe(0)
      store.filters.selectedTags = ['a', 'b']
      expect(store.activeFilterCount).toBe(1)
    })

    it('returns the unfiltered list itself when no filter is active', () => {
      const store = useConceptSetsStore()
      store.conceptSets = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] as ConceptSetListItem[]
      store.filters.searchQuery = '   '
      expect(store.filteredSets).toBe(store.conceptSets)
    })

    it('keeps sets carrying any one of the selected tags', () => {
      const store = useConceptSetsStore()
      store.conceptSets = [
        { id: 1, name: 'one', tags: [{ id: 1, name: 'a' }] },
        { id: 2, name: 'two', tags: [{ id: 2, name: 'c' }] },
        { id: 3, name: 'three' },
      ] as ConceptSetListItem[]
      store.filters.selectedTags = ['a', 'b']
      expect(store.filteredSets.map(s => s.id)).toEqual([1])
    })
  })

  describe('fetchAll / fetchOne', () => {
    it('falls back to a localized message when fetchAll rejects with a non-Error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getAllConceptSets).mockRejectedValueOnce('boom')
      await store.fetchAll()
      expect(store.error).toBe('Failed to fetch concept sets')
      expect(store.conceptSets).toEqual([])
    })

    it('asks the service to rethrow and shows loading while pending', async () => {
      const store = useConceptSetsStore()
      const pending = deferred<ConceptSet | null>()
      vi.mocked(getConceptSetById).mockReturnValueOnce(pending.promise)

      const request = store.fetchOne(4)
      expect(store.loading).toBe(true)
      expect(getConceptSetById).toHaveBeenCalledWith(4, { rethrow: true })

      pending.resolve(set(4))
      await request
      expect(store.loading).toBe(false)
    })

    it('falls back to a localized message when fetchOne rejects with a non-Error', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockRejectedValueOnce('boom')
      await store.fetchOne(1)
      expect(store.error).toBe('Failed to fetch concept set')
    })

    it('ignores a failure from a superseded request', async () => {
      const store = useConceptSetsStore()
      const older = deferred<ConceptSet | null>()
      vi.mocked(getConceptSetById)
        .mockReturnValueOnce(older.promise)
        .mockResolvedValueOnce(set(2))

      const first = store.fetchOne(1)
      await store.fetchOne(2)
      older.reject(new Error('stale failure'))
      await first

      expect(store.currentSet?.id).toBe(2)
      expect(store.error).toBeNull()
    })

    it('keeps loading while the newest request is still pending', async () => {
      const store = useConceptSetsStore()
      const older = deferred<ConceptSet | null>()
      const newer = deferred<ConceptSet | null>()
      vi.mocked(getConceptSetById)
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise)

      const first = store.fetchOne(1)
      const second = store.fetchOne(2)
      older.resolve(set(1))
      await first
      expect(store.loading).toBe(true)

      newer.resolve(set(2))
      await second
      expect(store.loading).toBe(false)
    })
  })

  describe('create / update / copy / remove', () => {
    it('create shows loading while pending and clears it after a failure', async () => {
      const store = useConceptSetsStore()
      const pending = deferred<ConceptSet>()
      vi.mocked(createConceptSet).mockReturnValueOnce(pending.promise)

      const request = store.create({ name: 'New', items: [] })
      expect(store.loading).toBe(true)
      pending.reject('boom')

      await expect(request).resolves.toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe('Failed to create concept set')
    })

    it('update shows loading while pending and clears it after a failure', async () => {
      const store = useConceptSetsStore()
      const pending = deferred<ConceptSet>()
      vi.mocked(updateConceptSet).mockReturnValueOnce(pending.promise)

      const request = store.update(set(1))
      expect(store.loading).toBe(true)
      pending.reject('boom')

      await expect(request).resolves.toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBe('Failed to update concept set')
    })

    it('copy numbers the name past every existing copy', async () => {
      const store = useConceptSetsStore()
      store.conceptSets = [
        { id: 1, name: 'Base' },
        { id: 2, name: 'Base (copy)' },
        { id: 3, name: 'Base (copy) 2' },
      ] as ConceptSetListItem[]
      vi.mocked(getConceptSetById).mockResolvedValueOnce(set(1, [item(5)], 'Base'))
      vi.mocked(createConceptSet).mockResolvedValueOnce(set(9, [item(5)], 'Base (copy) 3'))
      vi.mocked(getAllConceptSets).mockResolvedValueOnce(store.conceptSets)

      const request = store.copy(1)
      expect(store.loading).toBe(true)
      await request

      expect(getConceptSetById).toHaveBeenCalledWith(1, { rethrow: true })
      expect(createConceptSet).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Base (copy) 3' })
      )
      expect(store.loading).toBe(false)
    })

    it('copy reports a failure and clears loading', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockRejectedValueOnce('boom')

      await expect(store.copy(1)).resolves.toBeNull()
      expect(store.error).toBe('Failed to copy concept set')
      expect(store.loading).toBe(false)
    })

    it('copy surfaces the thrown error message', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockResolvedValueOnce(set(1))
      vi.mocked(createConceptSet).mockRejectedValueOnce(new Error('quota'))

      await expect(store.copy(1)).resolves.toBeNull()
      expect(store.error).toBe('quota')
    })

    it('remove drops only the deleted set and keeps an unrelated open set', async () => {
      const store = useConceptSetsStore()
      store.conceptSets = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }] as ConceptSetListItem[]
      store.currentSet = set(2)
      const pending = deferred<boolean>()
      vi.mocked(deleteConceptSet).mockReturnValueOnce(pending.promise)

      const request = store.remove(1)
      expect(store.loading).toBe(true)
      pending.resolve(true)
      await request

      expect(store.conceptSets.map(s => s.id)).toEqual([2])
      expect(store.currentSet?.id).toBe(2)
      expect(store.loading).toBe(false)
    })

    it('remove reports a non-Error failure and clears loading', async () => {
      const store = useConceptSetsStore()
      vi.mocked(deleteConceptSet).mockRejectedValueOnce('boom')

      await expect(store.remove(1)).resolves.toBe(false)
      expect(store.error).toBe('Failed to delete concept set')
      expect(store.loading).toBe(false)
    })
  })

  describe('syncTags', () => {
    it('leaves another open set untouched', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { ...set(8), tags: [{ id: 1, name: 'mine' }] } as ConceptSet
      vi.mocked(assignTagToConceptSet).mockResolvedValueOnce(true as never)

      await store.syncTags(7, [], [{ id: 2, name: 'new' }])

      expect(store.currentSet?.tags).toEqual([{ id: 1, name: 'mine' }])
    })

    it('updates the open set when ids match', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { ...set(7), tags: [] } as ConceptSet
      vi.mocked(assignTagToConceptSet).mockResolvedValueOnce(true as never)

      await expect(store.syncTags(7, [], [{ id: 2, name: 'new' }])).resolves.toEqual({
        success: true,
      })
      expect(store.currentSet?.tags).toEqual([{ id: 2, name: 'new' }])
    })

    it('joins localized per-tag failures with the server detail', async () => {
      const store = useConceptSetsStore()
      vi.mocked(assignTagToConceptSet).mockResolvedValueOnce({ success: false, error: 'add failed' } as never)
      vi.mocked(unassignTagFromConceptSet).mockResolvedValueOnce(false as never)

      const result = await store.syncTags(7, [{ id: 1, name: 'old' }], [{ id: 2, name: 'new' }])

      expect(result.success).toBe(false)
      expect(result.error).toBe(store.error)
      expect(store.error?.split('; ').sort()).toEqual([
        'Failed to assign tag "new": add failed',
        'Failed to unassign tag "old"',
      ])
    })
  })

  describe('editor and row editing', () => {
    it('does not open the editor when the set is not found', async () => {
      const store = useConceptSetsStore()
      vi.mocked(getConceptSetById).mockResolvedValueOnce(null)
      await store.openEditEditor(3)
      expect(store.editorOpen).toBe(false)
    })

    it('accepts the same concept with a different exclude or mapped flag', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])

      store.addConceptToSet(concept(10), { isExcluded: true })
      store.addConceptToSet(concept(10), { includeMapped: true })

      expect(store.error).toBeNull()
      expect(store.currentSet?.items).toHaveLength(3)
    })

    it('removeConceptFromSet keeps other concepts', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10), item(11)])
      store.removeConceptFromSet(10)
      expect(store.currentSet?.items.map(i => i.conceptId)).toEqual([11])
    })

    it('toggleConceptFlag flips only the matching concept', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10), item(11)])
      store.toggleConceptFlag(11, 'includeDescendants')
      expect(store.currentSet?.items.map(i => i.includeDescendants)).toEqual([false, true])
    })

    it('removeConceptItem leaves the list alone when the row is unknown', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10), item(11)])
      store.removeConceptItem(item(99))
      expect(store.currentSet?.items.map(i => i.conceptId)).toEqual([10, 11])
    })

    it('removeConceptItem prefers the exact row object over a look-alike', () => {
      const store = useConceptSetsStore()
      const first = { ...item(10), conceptName: 'first' }
      const second = { ...item(10), conceptName: 'second' }
      store.currentSet = set(1, [first, second])

      store.removeConceptItem(store.currentSet.items[1] as ConceptSetItem)

      expect(store.currentSet?.items.map(i => i.conceptName)).toEqual(['first'])
    })

    it('toggleConceptItemFlag flips a row without a conflicting sibling', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10), item(11)])
      store.error = 'stale'

      store.toggleConceptItemFlag(store.currentSet.items[0] as ConceptSetItem, 'isExcluded')

      expect(store.currentSet?.items[0]?.isExcluded).toBe(true)
      expect(store.error).toBeNull()
    })

    it('toggleConceptItemFlag refuses a toggle that duplicates a sibling', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10), item(10, { isExcluded: true })])

      store.toggleConceptItemFlag(store.currentSet.items[0] as ConceptSetItem, 'isExcluded')

      expect(store.currentSet?.items[0]?.isExcluded).toBe(false)
      expect(store.error).toBe('Another entry for this concept already uses those options')
    })

    it('setConceptItemFlags ignores an unknown row and leaves omitted flags untouched', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10, { isExcluded: true })])

      expect(() => store.setConceptItemFlags(item(99), { isExcluded: false })).not.toThrow()
      store.setConceptItemFlags(store.currentSet.items[0] as ConceptSetItem, {
        includeDescendants: true,
      })

      expect(store.currentSet?.items[0]).toMatchObject({
        isExcluded: true,
        includeDescendants: true,
        includeMapped: false,
      })
    })

    it('isConceptInSet is false for a concept missing from a non-empty set', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      expect(store.isConceptInSet(11)).toBe(false)
      expect(store.isConceptInSet(10)).toBe(true)
    })
  })

  describe('version preview', () => {
    const versioned = {
      versionDTO: { version: 3 } as never,
      entityDTO: { id: 1, name: 'Historic' },
      items: [item(42)],
    }

    it('loads the requested set first when it is not open', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(2)
      vi.mocked(getConceptSetById).mockResolvedValueOnce(set(1))
      vi.mocked(getVersion).mockResolvedValueOnce(versioned)

      await store.loadVersionPreview(3, 1)

      expect(getConceptSetById).toHaveBeenCalledWith(1, { rethrow: true })
      expect(getVersion).toHaveBeenCalledWith(1, 3)
    })

    it('does not refetch when the requested set is already open', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      vi.mocked(getVersion).mockResolvedValueOnce(versioned)

      await store.loadVersionPreview(3, 1)

      expect(getConceptSetById).not.toHaveBeenCalled()
    })

    it('rejects with a clear message when nothing is open', async () => {
      const store = useConceptSetsStore()
      await expect(store.loadVersionPreview(3)).rejects.toThrow('No current concept set ID')
      store.currentSet = { name: 'unsaved', items: [] } as ConceptSet
      await expect(store.loadVersionPreview(3)).rejects.toThrow('No current concept set ID')
      expect(getVersion).not.toHaveBeenCalled()
    })

    it('shows loading while pending and a localized error on a non-Error failure', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      const pending = deferred<typeof versioned>()
      vi.mocked(getVersion).mockReturnValueOnce(pending.promise)

      const request = store.loadVersionPreview(3)
      expect(store.loading).toBe(true)
      pending.reject('boom')

      await expect(request).rejects.toBe('boom')
      expect(store.loading).toBe(false)
      expect(store.error).toBe('Failed to load version 3')
    })

    it('clearPreviewVersion reloads the explicitly given set', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      vi.mocked(getConceptSetById).mockResolvedValueOnce(set(5))

      await store.clearPreviewVersion(5)

      expect(getConceptSetById).toHaveBeenCalledWith(5, { rethrow: true })
    })

    it('clearPreviewVersion reloads the open set, or nothing when none is open', async () => {
      const store = useConceptSetsStore()
      await store.clearPreviewVersion()
      expect(getConceptSetById).not.toHaveBeenCalled()

      store.currentSet = set(1)
      vi.mocked(getConceptSetById).mockResolvedValueOnce(set(1))
      await store.clearPreviewVersion()
      expect(getConceptSetById).toHaveBeenCalledWith(1, { rethrow: true })
    })

    it('savePreviewAsCurrent refuses without a preview even when a set is open', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      await expect(store.savePreviewAsCurrent()).resolves.toBe(false)
      expect(updateConceptSet).not.toHaveBeenCalled()
    })

    it('savePreviewAsCurrent refuses without set data', async () => {
      const store = useConceptSetsStore()
      store.previewVersion = { version: 3 } as never
      await expect(store.savePreviewAsCurrent()).resolves.toBe(false)
      expect(updateConceptSet).not.toHaveBeenCalled()
    })

    it('savePreviewAsCurrent clears the dirty flag on success', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      store.previewVersion = { version: 3 } as never
      store.isDirty = true
      vi.mocked(updateConceptSet).mockResolvedValueOnce(set(1))

      await expect(store.savePreviewAsCurrent()).resolves.toBe(true)
      expect(store.isDirty).toBe(false)
      expect(store.previewVersion).toBeNull()
    })
  })

  describe('comparison', () => {
    const rows: ComparisonResultItem[] = [{ conceptId: 1 } as ComparisonResultItem]

    it('reports nothing loaded for a set without items', async () => {
      const store = useConceptSetsStore()
      store.currentSet = { id: 1, name: 'empty' } as ConceptSet
      await store.loadComparisonForMode('SRC', 2, 'included')
      expect(store.comparisonError).toBe('No concept set loaded')
      expect(compareConceptSets).not.toHaveBeenCalled()
    })

    it('clears a previous result when comparing a set with itself', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      store.comparison = rows
      await store.loadComparisonForMode('SRC', 1, 'included')
      expect(store.comparison).toEqual([])
    })

    it('reuses the fetched other set across modes and refetches after the cache is cleared', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(getConceptSetById).mockResolvedValue(set(2, [item(11)]))
      vi.mocked(compareConceptSets).mockResolvedValue(rows)

      await store.loadComparisonForMode('SRC', 2, 'included')
      await store.loadComparisonForMode('SRC', 2, 'expression')
      expect(getConceptSetById).toHaveBeenCalledTimes(1)

      await store.loadComparisonForMode('SRC', 2, 'included')
      expect(compareConceptSets).toHaveBeenCalledTimes(1)

      store.clearComparisonCache()
      await store.loadComparisonForMode('SRC', 2, 'included')
      expect(compareConceptSets).toHaveBeenCalledTimes(2)
    })

    it('invalidates the cache when the other set changes', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(getConceptSetById)
        .mockResolvedValueOnce(set(2, [item(11)]))
        .mockResolvedValueOnce(set(3, [item(12)]))
      const secondRows = [{ conceptId: 2 } as ComparisonResultItem]
      vi.mocked(compareConceptSets).mockResolvedValueOnce(rows).mockResolvedValueOnce(secondRows)

      await store.loadComparisonForMode('SRC', 2, 'included')
      await store.loadComparisonForMode('SRC', 3, 'included')

      expect(store.comparison).toEqual(secondRows)
      expect(store.comparisonOtherSet?.id).toBe(3)
    })

    it('treats an other set without items as empty in expression and included modes', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(getConceptSetById).mockResolvedValue({ id: 2, name: 'bare' } as ConceptSet)
      vi.mocked(compareConceptSets).mockResolvedValue(rows)

      await store.loadComparisonForMode('SRC', 2, 'expression')
      expect(store.comparison).toEqual([
        expect.objectContaining({ conceptId: 10, conceptIn1Only: 1, conceptIn2Only: 0 }),
      ])

      await store.loadComparisonForMode('SRC', 2, 'included')
      expect(vi.mocked(compareConceptSets).mock.calls[0]?.[2]).toEqual({ items: [] })
    })

    it('source mode resolves both expressions and maps their included concept ids', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(getConceptSetById).mockResolvedValue(set(2, [item(20)]))
      vi.mocked(resolveConceptSetExpression)
        .mockResolvedValueOnce([concept(100)])
        .mockResolvedValueOnce([concept(200)])
      vi.mocked(getMappedSourceCodes)
        .mockResolvedValueOnce([concept(500)])
        .mockResolvedValueOnce([concept(500)])

      await store.loadComparisonForMode('SRC', 2, 'source')

      const exprs = vi.mocked(resolveConceptSetExpression).mock.calls.map(c => c[1])
      expect(exprs.map(e => e.items.map(i => i.concept.CONCEPT_ID))).toEqual([[10], [20]])
      expect(getMappedSourceCodes).toHaveBeenCalledWith('SRC', [100])
      expect(getMappedSourceCodes).toHaveBeenCalledWith('SRC', [200])
      expect(store.comparison).toEqual([
        expect.objectContaining({ conceptId: 500, conceptIn1And2: 1 }),
      ])
    })
  })

  describe('resolveIncluded', () => {
    it('clears previous results and loading when nothing is open', async () => {
      const store = useConceptSetsStore()
      store.includedItems = [concept(1)]
      store.includedLoading = true

      await expect(store.resolveIncluded()).resolves.toBeUndefined()

      expect(store.includedItems).toEqual([])
      expect(store.includedLoading).toBe(false)
      expect(resolveConceptSetExpression).not.toHaveBeenCalled()
    })

    it('prefers an explicit source key and sends the item expression', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(resolveConceptSetExpression).mockResolvedValueOnce([concept(10)])

      await store.resolveIncluded('EXPLICIT')

      expect(resolveConceptSetExpression).toHaveBeenCalledWith(
        'EXPLICIT',
        { items: [expect.objectContaining({ concept: expect.objectContaining({ CONCEPT_ID: 10 }) })] },
        expect.any(AbortSignal)
      )
      expect(store.includedItems).toEqual([concept(10)])
    })

    it('uses the WebAPI vocabulary source before the configured default', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(resolveConceptSetExpression).mockResolvedValueOnce([])

      await store.resolveIncluded()

      expect(vi.mocked(resolveConceptSetExpression).mock.calls[0]?.[0]).toBe('WEBAPI_VOCAB')
    })

    it('reports a missing vocabulary source', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vocabularySource.mockReturnValue(null)
      defaultSourceKey.mockReturnValue('')

      await store.resolveIncluded()

      expect(store.includedError).toBe('No vocabulary source available')
      expect(resolveConceptSetExpression).not.toHaveBeenCalled()
    })

    it('drops a stale response and keeps loading until the newest one lands', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      const older = deferred<Concept[]>()
      const newer = deferred<Concept[]>()
      vi.mocked(resolveConceptSetExpression)
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise)

      const first = store.resolveIncluded('K')
      const second = store.resolveIncluded('K')
      older.resolve([concept(1)])
      await first
      expect(store.includedItems).toEqual([])
      expect(store.includedLoading).toBe(true)

      newer.resolve([concept(2)])
      await second
      expect(store.includedItems).toEqual([concept(2)])
      expect(store.includedLoading).toBe(false)
    })

    it('drops a stale failure', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      const older = deferred<Concept[]>()
      vi.mocked(resolveConceptSetExpression)
        .mockReturnValueOnce(older.promise)
        .mockResolvedValueOnce([concept(2)])

      const first = store.resolveIncluded('K')
      await store.resolveIncluded('K')
      older.reject(new Error('stale'))
      await first

      expect(store.includedError).toBeNull()
    })

    it('stays silent on an abort error and reports other failures', async () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1, [item(10)])
      vi.mocked(resolveConceptSetExpression)
        .mockRejectedValueOnce(abortError())
        .mockRejectedValueOnce('boom')

      await store.resolveIncluded('K')
      expect(store.includedError).toBeNull()

      await store.resolveIncluded('K')
      expect(store.includedError).toBe('Failed to resolve concept set')
      expect(store.includedLoading).toBe(false)
    })
  })

  describe('resolveSourceCodes', () => {
    it('clears loading when nothing is included', async () => {
      const store = useConceptSetsStore()
      store.sourceCodeLoading = true
      await store.resolveSourceCodes('K')
      expect(store.sourceCodeLoading).toBe(false)
    })

    it('reports a missing vocabulary source without the configured default', async () => {
      const store = useConceptSetsStore()
      store.includedItems = [concept(1)]
      vocabularySource.mockReturnValue(null)

      await store.resolveSourceCodes()

      expect(store.sourceCodeError).toBe('No vocabulary source available')
      expect(getMappedSourceCodes).not.toHaveBeenCalled()
    })

    it('drops a stale response and keeps loading until the newest one lands', async () => {
      const store = useConceptSetsStore()
      store.includedItems = [concept(1)]
      const older = deferred<Concept[]>()
      const newer = deferred<Concept[]>()
      vi.mocked(getMappedSourceCodes)
        .mockReturnValueOnce(older.promise)
        .mockReturnValueOnce(newer.promise)

      const first = store.resolveSourceCodes('K')
      const second = store.resolveSourceCodes('K')
      expect(store.sourceCodeLoading).toBe(true)
      older.resolve([concept(7)])
      await first
      expect(store.sourceCodeItems).toEqual([])
      expect(store.sourceCodeLoading).toBe(true)

      newer.resolve([concept(8)])
      await second
      expect(store.sourceCodeItems).toEqual([concept(8)])
      expect(store.sourceCodeLoading).toBe(false)
    })

    it('drops a stale failure', async () => {
      const store = useConceptSetsStore()
      store.includedItems = [concept(1)]
      const older = deferred<Concept[]>()
      vi.mocked(getMappedSourceCodes)
        .mockReturnValueOnce(older.promise)
        .mockResolvedValueOnce([concept(8)])

      const first = store.resolveSourceCodes('K')
      await store.resolveSourceCodes('K')
      older.reject(new Error('stale'))
      await first

      expect(store.sourceCodeError).toBeNull()
    })

    it('stays silent on an abort error and reports other failures', async () => {
      const store = useConceptSetsStore()
      store.includedItems = [concept(1)]
      vi.mocked(getMappedSourceCodes)
        .mockRejectedValueOnce(abortError())
        .mockRejectedValueOnce('boom')

      await store.resolveSourceCodes('K')
      expect(store.sourceCodeError).toBeNull()

      await store.resolveSourceCodes('K')
      expect(store.sourceCodeError).toBe('Failed to resolve source codes')
    })
  })

  describe('applyProposal', () => {
    it('applies a name alone and marks the set dirty', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      expect(store.applyProposal({ name: 'Renamed' })).toBe(true)
      expect(store.isDirty).toBe(true)
    })

    it('ignores a payload without recognised changes', () => {
      const store = useConceptSetsStore()
      store.currentSet = set(1)
      expect(store.applyProposal({})).toBe(false)
      expect(store.applyProposal({ itemsToAdd: [] })).toBe(false)
      expect(store.isDirty).toBe(false)
    })
  })
})
