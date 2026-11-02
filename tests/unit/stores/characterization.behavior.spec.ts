import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useCharacterizationStore } from '@/stores/characterization'
import type {
  CharacterizationDefinition,
  CharacterizationExecution,
  CharacterizationListItem,
} from '@/models/characterization.types'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/characterization.service', () => ({
  listCharacterizations: vi.fn(),
  getCharacterization: vi.fn(),
  createCharacterization: vi.fn(),
  updateCharacterization: vi.fn(),
  deleteCharacterization: vi.fn(),
  copyCharacterization: vi.fn(),
  listCharacterizationExecutions: vi.fn(),
  getCharacterizationExecution: vi.fn(),
  generateCharacterization: vi.fn(),
  cancelCharacterizationGeneration: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  listCharacterizations,
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  deleteCharacterization,
  copyCharacterization,
  listCharacterizationExecutions,
  getCharacterizationExecution,
  generateCharacterization,
  cancelCharacterizationGeneration,
} from '@/services/characterization.service'
import { logger } from '@/utils/logger'

function apiErr(message: string) {
  return failure(new ApiError(message, 500, null))
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(r => {
    resolve = r
  })
  return { promise, resolve }
}

const DAY = 24 * 60 * 60 * 1000
const JAN_2025 = Date.UTC(2025, 0, 15)
const JUN_2025 = Date.UTC(2025, 5, 15)

const items: CharacterizationListItem[] = [
  {
    id: 1,
    name: 'Alpha',
    tags: [{ name: 'red' }],
    createdBy: { login: 'admin', name: 'Admin' },
    createdDate: JAN_2025,
    modifiedDate: JAN_2025,
  },
  {
    id: 2,
    name: 'Beta',
    tags: [{ name: 'blue' }, { name: 'red' }],
    createdBy: 'zed',
    createdDate: JUN_2025,
    modifiedDate: JUN_2025,
  },
  { id: 3, name: 'Gamma', createdBy: 'admin' },
]

const def: CharacterizationDefinition = {
  id: 1,
  name: 'Alpha',
  cohorts: [{ id: 11, name: 'C11' }],
  featureAnalyses: [{ id: 21, name: 'FA21' }],
  stratas: [],
}

const exec = (over: Partial<CharacterizationExecution>): CharacterizationExecution => ({
  id: 100,
  status: 'RUNNING',
  sourceKey: 'CDM',
  startTime: 1000,
  ...over,
})

describe('characterization store behavior', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('starts with no executions and no execution loading or error', () => {
    const store = useCharacterizationStore()
    expect(store.executions).toEqual([])
    expect(store.executionsLoading).toBe(false)
    expect(store.executionsError).toBeNull()
  })

  describe('filteredCharacterizations', () => {
    it('returns the list itself when no filter is active, including a blank search', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      expect(store.filteredCharacterizations).toBe(store.characterizations)
      store.filters.searchQuery = '   '
      expect(store.filteredCharacterizations).toBe(store.characterizations)
    })

    it('filters by author case-insensitively against user objects and strings', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.author = 'ADMIN'
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([1, 3])
    })

    it('keeps items carrying any of the selected tags', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.selectedTags = ['blue', 'red']
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([1, 2])
      store.filters.selectedTags = ['blue']
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([2])
    })

    it('filters by a created date range given only a lower bound', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.createdDateRange = { from: new Date(JUN_2025 - DAY) }
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([2])
    })

    it('filters by a created date range given only an upper bound', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.createdDateRange = { to: new Date(JAN_2025 + DAY) }
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([1])
    })

    it('filters by a modified date range given only a lower bound', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.modifiedDateRange = { from: new Date(JUN_2025 - DAY) }
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([2])
    })

    it('filters by a modified date range given only an upper bound', () => {
      const store = useCharacterizationStore()
      store.characterizations = items
      store.filters.modifiedDateRange = { to: new Date(JAN_2025 + DAY) }
      expect(store.filteredCharacterizations.map(c => c.id)).toEqual([1])
    })
  })

  it('lists distinct authors sorted, skipping items without an author', () => {
    const store = useCharacterizationStore()
    store.characterizations = [items[1]!, { id: 4, name: 'Delta' }, ...items]
    expect(store.availableAuthors).toEqual(['admin', 'zed'])
  })

  it('lists distinct tag names sorted', () => {
    const store = useCharacterizationStore()
    store.characterizations = items
    expect(store.availableTags).toEqual(['blue', 'red'])
  })

  describe('activeFilterCount', () => {
    it('is zero with default filters', () => {
      const store = useCharacterizationStore()
      expect(store.activeFilterCount).toBe(0)
    })

    it.each([
      ['searchQuery', { searchQuery: 'x' }],
      ['author', { author: 'admin' }],
      ['selectedTags', { selectedTags: ['red'] }],
      ['createdDateRange.from', { createdDateRange: { from: new Date(JAN_2025) } }],
      ['createdDateRange.to', { createdDateRange: { to: new Date(JAN_2025) } }],
      ['modifiedDateRange.from', { modifiedDateRange: { from: new Date(JAN_2025) } }],
      ['modifiedDateRange.to', { modifiedDateRange: { to: new Date(JAN_2025) } }],
    ])('counts %s as one active filter', (_name, patch) => {
      const store = useCharacterizationStore()
      store.filters = { ...store.filters, ...patch }
      expect(store.activeFilterCount).toBe(1)
    })

    it('counts every active filter', () => {
      const store = useCharacterizationStore()
      store.setFilters({
        searchQuery: 'x',
        author: 'a',
        selectedTags: ['red'],
        createdDateRange: { from: new Date(JAN_2025) },
        modifiedDateRange: { to: new Date(JUN_2025) },
      })
      expect(store.activeFilterCount).toBe(5)
    })
  })

  it('clearFilters resets every filter field', () => {
    const store = useCharacterizationStore()
    store.setFilters({
      searchQuery: 'x',
      author: 'a',
      selectedTags: ['red'],
      createdDateRange: { from: new Date(JAN_2025) },
      modifiedDateRange: { to: new Date(JUN_2025) },
    })
    store.clearFilters()
    expect(store.filters).toEqual({
      searchQuery: '',
      author: '',
      selectedTags: [],
      createdDateRange: {},
      modifiedDateRange: {},
    })
  })

  it('setFilters defaults missing selectedTags to an empty list', () => {
    const store = useCharacterizationStore()
    store.setFilters({
      searchQuery: '',
      author: '',
      createdDateRange: {},
      modifiedDateRange: {},
    } as unknown as Parameters<typeof store.setFilters>[0])
    expect(store.filters.selectedTags).toEqual([])
  })

  it('toggleTagFilterSelection adds then removes a tag', () => {
    const store = useCharacterizationStore()
    store.toggleTagFilterSelection('red')
    expect(store.filters.selectedTags).toEqual(['red'])
    store.toggleTagFilterSelection('red')
    expect(store.filters.selectedTags).toEqual([])
  })

  describe('loading flag across CRUD actions', () => {
    it('fetchOne holds loading until the response arrives', async () => {
      const store = useCharacterizationStore()
      const d = deferred<Awaited<ReturnType<typeof getCharacterization>>>()
      vi.mocked(getCharacterization).mockReturnValue(d.promise)
      const p = store.fetchOne(7)
      expect(store.loading).toBe(true)
      expect(getCharacterization).toHaveBeenCalledWith(7)
      d.resolve(success(def))
      await p
      expect(store.loading).toBe(false)
    })

    it('fetchOne clears loading after a failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(apiErr('x'))
      await store.fetchOne(7)
      expect(store.loading).toBe(false)
    })

    it.each([
      ['create', createCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.create(def)],
      ['update', updateCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.update(def)],
      ['copy', copyCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.copy(1)],
    ] as const)('%s holds loading in flight, refreshes the list and clears loading', async (_n, svc, run) => {
      const store = useCharacterizationStore()
      const d = deferred<Awaited<ReturnType<typeof createCharacterization>>>()
      vi.mocked(svc).mockReturnValue(d.promise)
      vi.mocked(listCharacterizations).mockResolvedValue(success(items))
      const p = run(store)
      expect(store.loading).toBe(true)
      d.resolve(success(def))
      await p
      expect(store.loading).toBe(false)
      expect(store.characterizations).toEqual(items)
    })

    it.each([
      ['create', createCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.create(def)],
      ['update', updateCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.update(def)],
      ['copy', copyCharacterization, (s: ReturnType<typeof useCharacterizationStore>) => s.copy(1)],
    ] as const)('%s clears loading and skips the list refresh after a failure', async (_n, svc, run) => {
      const store = useCharacterizationStore()
      vi.mocked(svc).mockResolvedValue(apiErr('bad'))
      await run(store)
      expect(store.loading).toBe(false)
      expect(listCharacterizations).not.toHaveBeenCalled()
    })

    it('remove holds loading in flight and clears it afterwards', async () => {
      const store = useCharacterizationStore()
      const d = deferred<Awaited<ReturnType<typeof deleteCharacterization>>>()
      vi.mocked(deleteCharacterization).mockReturnValue(d.promise)
      const p = store.remove(1)
      expect(store.loading).toBe(true)
      d.resolve(success(undefined))
      await p
      expect(store.loading).toBe(false)
    })

    it('remove clears loading after a failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(deleteCharacterization).mockResolvedValue(apiErr('bad'))
      await store.remove(1)
      expect(store.loading).toBe(false)
    })
  })

  it('remove keeps the other items and an unrelated current characterization', async () => {
    const store = useCharacterizationStore()
    store.characterizations = [...items]
    store.currentCharacterization = { ...def, id: 2 }
    vi.mocked(deleteCharacterization).mockResolvedValue(success(undefined))

    await store.remove(1)

    expect(deleteCharacterization).toHaveBeenCalledWith(1)
    expect(store.characterizations.map(c => c.id)).toEqual([2, 3])
    expect(store.currentCharacterization?.id).toBe(2)
  })

  describe('executions', () => {
    it('sorts executions newest-first, treating a missing start time as oldest', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizationExecutions).mockResolvedValue(
        success([
          exec({ id: 1, startTime: undefined }),
          exec({ id: 2, startTime: 5000 }),
          exec({ id: 3, startTime: 1000 }),
        ])
      )
      await store.loadExecutions(9)
      expect(store.executions.map(e => e.id)).toEqual([2, 3, 1])
    })

    it('holds executionsLoading while the list is in flight', async () => {
      const store = useCharacterizationStore()
      const d = deferred<Awaited<ReturnType<typeof listCharacterizationExecutions>>>()
      vi.mocked(listCharacterizationExecutions).mockReturnValue(d.promise)
      const p = store.loadExecutions(9)
      expect(store.executionsLoading).toBe(true)
      d.resolve(success([]))
      await p
      expect(store.executionsLoading).toBe(false)
    })

    it('runExecution prepends a new id ahead of existing executions', async () => {
      const store = useCharacterizationStore()
      store.executions = [exec({ id: 1 }), exec({ id: 2 })]
      vi.mocked(generateCharacterization).mockResolvedValue(success(exec({ id: 3 })))

      await store.runExecution(9, 'CDM')

      expect(generateCharacterization).toHaveBeenCalledWith(9, 'CDM')
      expect(store.executions.map(e => e.id)).toEqual([3, 1, 2])
    })

    it('runExecution replaces a matching id in place', async () => {
      const store = useCharacterizationStore()
      store.executions = [exec({ id: 1 }), exec({ id: 2, status: 'PENDING' })]
      vi.mocked(generateCharacterization).mockResolvedValue(success(exec({ id: 2, status: 'RUNNING' })))

      await store.runExecution(9, 'CDM')

      expect(store.executions.map(e => [e.id, e.status])).toEqual([
        [1, 'RUNNING'],
        [2, 'RUNNING'],
      ])
    })

    it('runExecution prepends an execution without an id rather than matching another id-less row', async () => {
      const store = useCharacterizationStore()
      const idless = { status: 'PENDING', sourceKey: 'CDM' } as unknown as CharacterizationExecution
      store.executions = [idless]
      vi.mocked(generateCharacterization).mockResolvedValue(
        success({ status: 'RUNNING', sourceKey: 'CDM' } as unknown as CharacterizationExecution)
      )

      await store.runExecution(9, 'CDM')

      expect(store.executions.map(e => e.status)).toEqual(['RUNNING', 'PENDING'])
    })

    it('cancelExecution without a generation id does not start polling', async () => {
      const store = useCharacterizationStore()
      vi.mocked(cancelCharacterizationGeneration).mockResolvedValue(success(undefined))
      vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))

      await store.cancelExecution(9, 'CDM')

      expect(store.pollingHandles.size).toBe(0)
      expect(getCharacterizationExecution).not.toHaveBeenCalled()
    })
  })

  describe('pollExecution', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    it('replaces the polled execution in place when it is first in the list', async () => {
      const store = useCharacterizationStore()
      store.executions = [exec({ id: 300, status: 'PENDING' }), exec({ id: 1 })]
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300, status: 'RUNNING' })))

      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      store.dispose()

      expect(getCharacterizationExecution).toHaveBeenCalledWith(300)
      expect(store.executions.map(e => [e.id, e.status])).toEqual([
        [300, 'RUNNING'],
        [1, 'RUNNING'],
      ])
    })

    it('replaces the polled execution in place when it is not first in the list', async () => {
      const store = useCharacterizationStore()
      store.executions = [exec({ id: 1, status: 'COMPLETED' }), exec({ id: 300, status: 'PENDING' })]
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300, status: 'RUNNING' })))

      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      store.dispose()

      expect(store.executions.map(e => [e.id, e.status])).toEqual([
        [1, 'COMPLETED'],
        [300, 'RUNNING'],
      ])
    })

    it('prepends a polled execution missing from the list', async () => {
      const store = useCharacterizationStore()
      store.executions = [exec({ id: 1, status: 'COMPLETED' })]
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300, status: 'RUNNING' })))

      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      store.dispose()

      expect(store.executions.map(e => e.id)).toEqual([300, 1])
    })

    it('registers only one poller per generation id', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300 })))

      store.pollExecution(300)
      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      store.dispose()

      expect(getCharacterizationExecution).toHaveBeenCalledTimes(1)
    })

    it('stops polling once a terminal status arrives', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300, status: 'COMPLETED' })))

      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(10000)

      expect(getCharacterizationExecution).toHaveBeenCalledTimes(1)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it('stops polling when the fetch fails', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterizationExecution).mockResolvedValue(apiErr('gone'))

      store.pollExecution(300)
      await vi.advanceTimersByTimeAsync(0)
      await vi.advanceTimersByTimeAsync(10000)

      expect(getCharacterizationExecution).toHaveBeenCalledTimes(1)
    })

    it('logs a throwing onTerminal callback and still clears the registry', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterizationExecution).mockResolvedValue(success(exec({ id: 300, status: 'FAILED' })))
      const boom = new Error('boom')

      store.pollExecution(300, () => {
        throw boom
      })
      await vi.advanceTimersByTimeAsync(0)

      expect(logger.error).toHaveBeenCalledWith(
        'CharacterizationStore',
        'pollExecution onTerminal threw',
        boom
      )
      expect(store.pollingHandles.has(300)).toBe(false)
    })
  })

  it('dispose logs a throwing stop handle and still clears every handle', () => {
    const store = useCharacterizationStore()
    const boom = new Error('stop failed')
    const other = vi.fn()
    store.pollingHandles.set(1, () => {
      throw boom
    })
    store.pollingHandles.set(2, other)

    store.dispose()

    expect(other).toHaveBeenCalledOnce()
    expect(logger.error).toHaveBeenCalledWith('CharacterizationStore', 'dispose stop threw', boom)
    expect(store.pollingHandles.size).toBe(0)
  })

  describe('applyProposal', () => {
    it('returns false and stays clean without a current characterization', () => {
      const store = useCharacterizationStore()
      expect(store.applyProposal({ name: 'X' })).toBe(false)
      expect(store.isDirty).toBe(false)
    })

    it('returns false and stays clean for an empty payload', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({})).toBe(false)
      expect(store.isDirty).toBe(false)
      expect(store.currentCharacterization).toEqual(def)
    })

    it('ignores a blank name', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ name: '   ' })).toBe(false)
      expect(store.currentCharacterization.name).toBe('Alpha')
      expect(store.isDirty).toBe(false)
    })

    it('applies a non-blank name and marks dirty', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ name: 'Renamed' })).toBe(true)
      expect(store.currentCharacterization.name).toBe('Renamed')
      expect(store.isDirty).toBe(true)
    })

    it('applies an empty description', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = { ...structuredClone(def), description: 'old' }
      expect(store.applyProposal({ description: '' })).toBe(true)
      expect(store.currentCharacterization.description).toBe('')
      expect(store.isDirty).toBe(true)
    })

    it('replaces cohorts and feature analyses wholesale, even with empty lists', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ cohorts: [], featureAnalyses: [] })).toBe(true)
      expect(store.currentCharacterization.cohorts).toEqual([])
      expect(store.currentCharacterization.featureAnalyses).toEqual([])
    })

    it('prefers a full replacement over an append list', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      store.applyProposal({
        cohorts: [{ id: 50, name: 'C50' }],
        cohortsToAdd: [{ id: 51, name: 'C51' }],
        featureAnalyses: [{ id: 60, name: 'F60' }],
        featureAnalysesToAdd: [{ id: 61, name: 'F61' }],
      })
      expect(store.currentCharacterization.cohorts).toEqual([{ id: 50, name: 'C50' }])
      expect(store.currentCharacterization.featureAnalyses).toEqual([{ id: 60, name: 'F60' }])
    })

    it('appends cohorts and feature analyses, skipping ids already present or repeated', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      const originalCohorts = store.currentCharacterization.cohorts

      const applied = store.applyProposal({
        cohortsToAdd: [
          { id: 11, name: 'dup' },
          { id: 12, name: 'C12' },
          { id: 12, name: 'again' },
        ],
        featureAnalysesToAdd: [
          { id: 21, name: 'dup' },
          { id: 22, name: 'FA22' },
          { id: 22, name: 'again' },
        ],
      })

      expect(applied).toBe(true)
      expect(store.isDirty).toBe(true)
      expect(store.currentCharacterization.cohorts).toEqual([
        { id: 11, name: 'C11' },
        { id: 12, name: 'C12' },
      ])
      expect(store.currentCharacterization.featureAnalyses).toEqual([
        { id: 21, name: 'FA21' },
        { id: 22, name: 'FA22' },
      ])
      expect(store.currentCharacterization.cohorts).not.toBe(originalCohorts)
      expect(originalCohorts).toEqual([{ id: 11, name: 'C11' }])
    })

    it('appends onto missing cohort and feature analysis lists', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = {
        id: 1,
        name: 'Bare',
      } as unknown as CharacterizationDefinition

      store.applyProposal({
        cohortsToAdd: [{ id: 1, name: 'C1' }],
        featureAnalysesToAdd: [{ id: 2, name: 'F2' }],
      })

      expect(store.currentCharacterization.cohorts).toEqual([{ id: 1, name: 'C1' }])
      expect(store.currentCharacterization.featureAnalyses).toEqual([{ id: 2, name: 'F2' }])
    })

    it('treats empty append lists as no change', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ cohortsToAdd: [], featureAnalysesToAdd: [] })).toBe(false)
      expect(store.isDirty).toBe(false)
    })

    it('reports applied when only feature analyses are appended', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ featureAnalysesToAdd: [{ id: 99, name: 'F99' }] })).toBe(true)
      expect(store.isDirty).toBe(true)
    })

    it('reports applied when only cohorts are appended', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ cohortsToAdd: [{ id: 99, name: 'C99' }] })).toBe(true)
      expect(store.isDirty).toBe(true)
    })

    it('reports applied when only feature analyses are replaced', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ featureAnalyses: [] })).toBe(true)
    })

    it('reports applied when only cohorts are replaced', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = structuredClone(def)
      expect(store.applyProposal({ cohorts: [] })).toBe(true)
    })
  })
})
