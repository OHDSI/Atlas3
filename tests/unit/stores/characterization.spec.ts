/**
 * Characterization Store Tests
 *
 * Happy path + error path coverage for the CRUD actions plus the
 * dirty-tracking and clear helpers. Service layer is mocked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useCharacterizationStore } from '@/stores/characterization'
import type {
  CharacterizationDefinition,
  CharacterizationListItem,
} from '@/models/characterization.types'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'

// Mock service layer
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
import type { CharacterizationExecution } from '@/models/characterization.types'

function apiErr(message: string, status = 0) {
  return failure(new ApiError(message, status, null))
}

const mockList: CharacterizationListItem[] = [
  {
    id: 1,
    name: 'Diabetes Cohort Profile',
    description: 'Demographics + comorbidities',
    cohorts: [{ id: 11, name: 'Diabetes' }],
    featureAnalyses: [{ id: 21 }, { id: 22 }],
    createdBy: { login: 'admin', name: 'Admin' },
    createdDate: 1737000000000,
    modifiedDate: 1737500000000,
  },
  {
    id: 2,
    name: 'Hypertension Profile',
    cohorts: [{ id: 12, name: 'HTN' }],
    featureAnalyses: [{ id: 21 }],
    createdBy: 'ohdsi',
  },
  {
    id: 3,
    name: 'Custom Drug Counts',
    cohorts: [],
    featureAnalyses: [],
  },
]

const mockCC: CharacterizationDefinition = {
  id: 1,
  name: 'Diabetes Cohort Profile',
  description: 'Demographics + comorbidities',
  cohorts: [{ id: 11, name: 'Diabetes' }],
  featureAnalyses: [{ id: 21 }, { id: 22 }],
  stratas: [],
}

describe('Characterization Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial state', () => {
    it('should start with empty list', () => {
      const store = useCharacterizationStore()
      expect(store.characterizations).toEqual([])
      expect(store.currentCharacterization).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.filterTerm).toBe('')
      expect(store.previewVersion).toBeNull()
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Getters', () => {
    it('filteredCharacterizations returns all when no filter term', () => {
      const store = useCharacterizationStore()
      store.characterizations = mockList
      expect(store.filteredCharacterizations).toEqual(mockList)
    })

    it('filteredCharacterizations filters by name (case-insensitive)', () => {
      const store = useCharacterizationStore()
      store.characterizations = mockList
      store.filterTerm = 'CUSTOM'
      expect(store.filteredCharacterizations).toEqual([mockList[2]])
    })

    it('isEmpty is true when list empty', () => {
      const store = useCharacterizationStore()
      expect(store.isEmpty).toBe(true)
    })

    it('isEmpty is false when list populated', () => {
      const store = useCharacterizationStore()
      store.characterizations = mockList
      expect(store.isEmpty).toBe(false)
    })
  })

  describe('fetchAll', () => {
    it('populates list on success', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizations).mockResolvedValue(success(mockList))

      await store.fetchAll()

      expect(store.characterizations).toEqual(mockList)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets loading while in flight', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizations).mockImplementation(() => new Promise(() => {}))

      const _p = store.fetchAll()
      expect(store.loading).toBe(true)
    })

    it('shares one request between concurrent callers', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizations).mockResolvedValue(success(mockList))

      await Promise.all([store.fetchAll(), store.fetchAll()])

      expect(listCharacterizations).toHaveBeenCalledTimes(1)
      expect(store.characterizations).toEqual(mockList)
    })

    it('captures error and resets list on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizations).mockResolvedValue(apiErr('Network down'))

      await store.fetchAll()

      expect(store.error).toBe('Network down')
      expect(store.characterizations).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchOne', () => {
    it('populates currentCharacterization on success', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(success(mockCC))

      await store.fetchOne(1)

      expect(store.currentCharacterization).toEqual(mockCC)
    })

    it('captures error on failure (e.g. not found)', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(apiErr('Characterization not found', 404))

      await store.fetchOne(999)

      expect(store.error).toBe('Characterization not found')
      expect(store.currentCharacterization).toBeNull()
    })

    it('captures error on generic failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(apiErr('Boom'))

      await store.fetchOne(1)

      expect(store.error).toBe('Boom')
      expect(store.currentCharacterization).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and refreshes list', async () => {
      const store = useCharacterizationStore()
      vi.mocked(createCharacterization).mockResolvedValue(success(mockCC))
      vi.mocked(listCharacterizations).mockResolvedValue(success(mockList))

      const result = await store.create(mockCC)

      expect(result).toEqual(mockCC)
      expect(store.currentCharacterization).toEqual(mockCC)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(createCharacterization).mockResolvedValue(apiErr('Server error'))

      const result = await store.create(mockCC)

      expect(result).toBeNull()
      expect(store.error).toBe('Server error')
    })
  })

  describe('update', () => {
    it('updates and refreshes list', async () => {
      const store = useCharacterizationStore()
      const updated = { ...mockCC, name: 'Renamed' }
      vi.mocked(updateCharacterization).mockResolvedValue(success(updated))
      vi.mocked(listCharacterizations).mockResolvedValue(success(mockList))

      const result = await store.update(updated)

      expect(result).toEqual(updated)
      expect(store.currentCharacterization).toEqual(updated)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(updateCharacterization).mockResolvedValue(apiErr('Conflict'))

      const result = await store.update(mockCC)

      expect(result).toBeNull()
      expect(store.error).toBe('Conflict')
    })
  })

  describe('remove', () => {
    it('removes from list on success', async () => {
      const store = useCharacterizationStore()
      store.characterizations = [...mockList]
      vi.mocked(deleteCharacterization).mockResolvedValue(success(undefined))

      const result = await store.remove(1)

      expect(result).toBe(true)
      expect(store.characterizations.find((cc) => cc.id === 1)).toBeUndefined()
    })

    it('clears currentCharacterization when deleted item was selected', async () => {
      const store = useCharacterizationStore()
      store.characterizations = [...mockList]
      store.currentCharacterization = { ...mockCC }
      vi.mocked(deleteCharacterization).mockResolvedValue(success(undefined))

      await store.remove(1)

      expect(store.currentCharacterization).toBeNull()
    })

    it('returns false and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(deleteCharacterization).mockResolvedValue(apiErr('Gone'))

      const result = await store.remove(1)

      expect(result).toBe(false)
      expect(store.error).toBe('Gone')
    })
  })

  describe('copy', () => {
    it('copies, refreshes, and sets currentCharacterization', async () => {
      const store = useCharacterizationStore()
      const copied = { ...mockCC, id: 42, name: 'COPY OF Diabetes Cohort Profile' }
      vi.mocked(copyCharacterization).mockResolvedValue(success(copied))
      vi.mocked(listCharacterizations).mockResolvedValue(success(mockList))

      const result = await store.copy(1)

      expect(result).toEqual(copied)
      expect(store.currentCharacterization).toEqual(copied)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(copyCharacterization).mockResolvedValue(apiErr('Nope'))

      const result = await store.copy(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Nope')
    })
  })

  describe('setFilter (debounced)', () => {
    it('updates filterTerm after debounce window', () => {
      vi.useFakeTimers()
      const store = useCharacterizationStore()

      store.setFilter('diabetes')
      expect(store.filterTerm).toBe('')

      vi.advanceTimersByTime(300)
      expect(store.filterTerm).toBe('diabetes')

      vi.useRealTimers()
    })
  })

  describe('clearError / clearCurrent / dirty helpers', () => {
    it('clearError resets error', () => {
      const store = useCharacterizationStore()
      store.error = 'something'
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('clearCurrent resets currentCharacterization', () => {
      const store = useCharacterizationStore()
      store.currentCharacterization = { ...mockCC }
      store.clearCurrent()
      expect(store.currentCharacterization).toBeNull()
    })

    it('markDirty / markClean toggle isDirty', () => {
      const store = useCharacterizationStore()
      expect(store.isDirty).toBe(false)
      store.markDirty()
      expect(store.isDirty).toBe(true)
      store.markClean()
      expect(store.isDirty).toBe(false)
    })
  })

  describe('Executions', () => {
    const baseExec: CharacterizationExecution = {
      id: 100,
      status: 'RUNNING',
      sourceKey: 'CDM_V5',
      startTime: 1700000000000,
    }

    describe('loadExecutions', () => {
      it('populates executions sorted newest-first', async () => {
        const store = useCharacterizationStore()
        const older: CharacterizationExecution = {
          ...baseExec,
          id: 1,
          startTime: 1000,
          status: 'COMPLETED',
        }
        const newer: CharacterizationExecution = {
          ...baseExec,
          id: 2,
          startTime: 2000,
          status: 'COMPLETED',
        }
        vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([older, newer]))

        await store.loadExecutions(42)

        expect(store.executions[0]?.id).toBe(2)
        expect(store.executions[1]?.id).toBe(1)
        expect(store.executionsLoading).toBe(false)
        expect(store.executionsError).toBeNull()
      })

      it('captures error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(listCharacterizationExecutions).mockResolvedValue(apiErr('Boom'))

        await store.loadExecutions(42)

        expect(store.executionsError).toBe('Boom')
        expect(store.executions).toEqual([])
        expect(store.executionsLoading).toBe(false)
      })
    })

    describe('runExecution', () => {
      it('prepends new execution and returns it', async () => {
        const store = useCharacterizationStore()
        const created: CharacterizationExecution = { ...baseExec, id: 200 }
        vi.mocked(generateCharacterization).mockResolvedValue(success(created))

        const result = await store.runExecution(42, 'CDM_V5')

        expect(result).toEqual(created)
        expect(store.executions[0]).toEqual(created)
        expect(store.executionsError).toBeNull()
      })

      it('replaces an existing execution with the same id', async () => {
        const store = useCharacterizationStore()
        const initial: CharacterizationExecution = { ...baseExec, id: 200, status: 'PENDING' }
        store.executions = [initial]
        const updated: CharacterizationExecution = { ...initial, status: 'RUNNING' }
        vi.mocked(generateCharacterization).mockResolvedValue(success(updated))

        await store.runExecution(42, 'CDM_V5')

        expect(store.executions).toHaveLength(1)
        expect(store.executions[0]?.status).toBe('RUNNING')
      })

      it('refreshes the canonical list and returns null when the response carried no trackable execution', async () => {
        const store = useCharacterizationStore()
        const existing: CharacterizationExecution = { ...baseExec, id: 500 }
        store.executions = [existing]
        const canonical: CharacterizationExecution = { ...baseExec, id: 501, status: 'PENDING' }
        vi.mocked(generateCharacterization).mockResolvedValue(success(null))
        vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([canonical]))

        const result = await store.runExecution(42, 'CDM_V5')

        expect(result).toBeNull()
        expect(listCharacterizationExecutions).toHaveBeenCalledWith(42)
        expect(store.executions).toEqual([canonical])
        expect(store.executions.some((e) => e.id === 0)).toBe(false)
        expect(store.executionsError).toBeNull()
      })

      it('rethrows and sets error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(generateCharacterization).mockResolvedValue(apiErr('Down'))

        await expect(store.runExecution(42, 'CDM_V5')).rejects.toThrow('Down')
        expect(store.executionsError).toBe('Down')
      })
    })

    describe('cancelExecution', () => {
      it('calls cancel and refreshes the list', async () => {
        const store = useCharacterizationStore()
        vi.mocked(cancelCharacterizationGeneration).mockResolvedValue(success(undefined))
        vi.mocked(listCharacterizationExecutions).mockResolvedValue(success([]))

        await store.cancelExecution(42, 'CDM_V5')

        expect(cancelCharacterizationGeneration).toHaveBeenCalledWith(42, 'CDM_V5')
        expect(listCharacterizationExecutions).toHaveBeenCalledWith(42)
      })

      it('rethrows and sets error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(cancelCharacterizationGeneration).mockResolvedValue(apiErr('Cant'))

        await expect(store.cancelExecution(42, 'CDM_V5')).rejects.toThrow('Cant')
        expect(store.executionsError).toBe('Cant')
      })
    })

    describe('pollExecution', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })
      afterEach(() => {
        vi.useRealTimers()
      })

      it('updates the matching execution and stops on terminal status', async () => {
        const store = useCharacterizationStore()
        store.executions = [{ ...baseExec, id: 300, status: 'PENDING' }]

        vi.mocked(getCharacterizationExecution)
          .mockResolvedValueOnce(success({ ...baseExec, id: 300, status: 'RUNNING' }))
          .mockResolvedValueOnce(success({ ...baseExec, id: 300, status: 'COMPLETED' }))

        const onTerminal = vi.fn<[CharacterizationExecution], void>()

        store.pollExecution(300, onTerminal)
        // Allow the immediate tick to resolve.
        await vi.advanceTimersByTimeAsync(0)
        expect(store.executions[0]?.status).toBe('RUNNING')
        expect(store.pollingHandles.has(300)).toBe(true)

        // Advance to the next scheduled poll (default 3000ms).
        await vi.advanceTimersByTimeAsync(3000)
        await vi.advanceTimersByTimeAsync(0)

        expect(store.executions[0]?.status).toBe('COMPLETED')
        expect(onTerminal).toHaveBeenCalledOnce()
        expect(store.pollingHandles.has(300)).toBe(false)
      })

      it('stopPolling cancels an in-flight poll', async () => {
        const store = useCharacterizationStore()
        vi.mocked(getCharacterizationExecution).mockResolvedValue(
          success({ ...baseExec, id: 400, status: 'RUNNING' })
        )

        store.pollExecution(400)
        await vi.advanceTimersByTimeAsync(0)

        expect(store.pollingHandles.has(400)).toBe(true)
        store.stopPolling(400)
        expect(store.pollingHandles.has(400)).toBe(false)

        // Subsequent ticks must not run.
        const callsBefore = vi.mocked(getCharacterizationExecution).mock.calls.length
        await vi.advanceTimersByTimeAsync(10000)
        expect(vi.mocked(getCharacterizationExecution).mock.calls.length).toBe(callsBefore)
      })

      it('dispose clears all pollers and stops future ticks', async () => {
        const store = useCharacterizationStore()
        vi.mocked(getCharacterizationExecution).mockResolvedValue(
          success({ ...baseExec, id: 500, status: 'RUNNING' })
        )

        store.pollExecution(500)
        await vi.advanceTimersByTimeAsync(0)
        expect(store.pollingHandles.has(500)).toBe(true)

        store.dispose()
        expect(store.pollingHandles.has(500)).toBe(false)

        const callsBefore = vi.mocked(getCharacterizationExecution).mock.calls.length
        await vi.advanceTimersByTimeAsync(10000)
        expect(vi.mocked(getCharacterizationExecution).mock.calls.length).toBe(callsBefore)
      })
    })
  })
})
