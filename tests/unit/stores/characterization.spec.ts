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
      vi.mocked(listCharacterizations).mockResolvedValue(mockList)

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

    it('skips when already loading', async () => {
      const store = useCharacterizationStore()
      store.loading = true

      await store.fetchAll()

      expect(listCharacterizations).not.toHaveBeenCalled()
    })

    it('captures error and resets list on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(listCharacterizations).mockRejectedValue(new Error('Network down'))

      await store.fetchAll()

      expect(store.error).toBe('Network down')
      expect(store.characterizations).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchOne', () => {
    it('populates currentCharacterization on success', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(mockCC)

      await store.fetchOne(1)

      expect(store.currentCharacterization).toEqual(mockCC)
    })

    it('sets error on not found', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockResolvedValue(null)

      await store.fetchOne(999)

      expect(store.error).toBe('Characterization not found')
      expect(store.currentCharacterization).toBeNull()
    })

    it('captures error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(getCharacterization).mockRejectedValue(new Error('Boom'))

      await store.fetchOne(1)

      expect(store.error).toBe('Boom')
      expect(store.currentCharacterization).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and refreshes list', async () => {
      const store = useCharacterizationStore()
      vi.mocked(createCharacterization).mockResolvedValue(mockCC)
      vi.mocked(listCharacterizations).mockResolvedValue(mockList)

      const result = await store.create(mockCC)

      expect(result).toEqual(mockCC)
      expect(store.currentCharacterization).toEqual(mockCC)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(createCharacterization).mockRejectedValue(new Error('Server error'))

      const result = await store.create(mockCC)

      expect(result).toBeNull()
      expect(store.error).toBe('Server error')
    })
  })

  describe('update', () => {
    it('updates and refreshes list', async () => {
      const store = useCharacterizationStore()
      const updated = { ...mockCC, name: 'Renamed' }
      vi.mocked(updateCharacterization).mockResolvedValue(updated)
      vi.mocked(listCharacterizations).mockResolvedValue(mockList)

      const result = await store.update(updated)

      expect(result).toEqual(updated)
      expect(store.currentCharacterization).toEqual(updated)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(updateCharacterization).mockRejectedValue(new Error('Conflict'))

      const result = await store.update(mockCC)

      expect(result).toBeNull()
      expect(store.error).toBe('Conflict')
    })
  })

  describe('remove', () => {
    it('removes from list on success', async () => {
      const store = useCharacterizationStore()
      store.characterizations = [...mockList]
      vi.mocked(deleteCharacterization).mockResolvedValue(undefined)

      const result = await store.remove(1)

      expect(result).toBe(true)
      expect(store.characterizations.find((cc) => cc.id === 1)).toBeUndefined()
    })

    it('clears currentCharacterization when deleted item was selected', async () => {
      const store = useCharacterizationStore()
      store.characterizations = [...mockList]
      store.currentCharacterization = { ...mockCC }
      vi.mocked(deleteCharacterization).mockResolvedValue(undefined)

      await store.remove(1)

      expect(store.currentCharacterization).toBeNull()
    })

    it('returns false and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(deleteCharacterization).mockRejectedValue(new Error('Gone'))

      const result = await store.remove(1)

      expect(result).toBe(false)
      expect(store.error).toBe('Gone')
    })
  })

  describe('copy', () => {
    it('copies, refreshes, and sets currentCharacterization', async () => {
      const store = useCharacterizationStore()
      const copied = { ...mockCC, id: 42, name: 'COPY OF Diabetes Cohort Profile' }
      vi.mocked(copyCharacterization).mockResolvedValue(copied)
      vi.mocked(listCharacterizations).mockResolvedValue(mockList)

      const result = await store.copy(1)

      expect(result).toEqual(copied)
      expect(store.currentCharacterization).toEqual(copied)
    })

    it('returns null and sets error on failure', async () => {
      const store = useCharacterizationStore()
      vi.mocked(copyCharacterization).mockRejectedValue(new Error('Nope'))

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
        vi.mocked(listCharacterizationExecutions).mockResolvedValue([older, newer])

        await store.loadExecutions(42)

        expect(store.executions[0]?.id).toBe(2)
        expect(store.executions[1]?.id).toBe(1)
        expect(store.executionsLoading).toBe(false)
        expect(store.executionsError).toBeNull()
      })

      it('captures error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(listCharacterizationExecutions).mockRejectedValue(new Error('Boom'))

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
        vi.mocked(generateCharacterization).mockResolvedValue(created)

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
        vi.mocked(generateCharacterization).mockResolvedValue(updated)

        await store.runExecution(42, 'CDM_V5')

        expect(store.executions).toHaveLength(1)
        expect(store.executions[0]?.status).toBe('RUNNING')
      })

      it('rethrows and sets error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(generateCharacterization).mockRejectedValue(new Error('Down'))

        await expect(store.runExecution(42, 'CDM_V5')).rejects.toThrow('Down')
        expect(store.executionsError).toBe('Down')
      })
    })

    describe('cancelExecution', () => {
      it('calls cancel and refreshes the list', async () => {
        const store = useCharacterizationStore()
        vi.mocked(cancelCharacterizationGeneration).mockResolvedValue(undefined)
        vi.mocked(listCharacterizationExecutions).mockResolvedValue([])

        await store.cancelExecution(42, 'CDM_V5')

        expect(cancelCharacterizationGeneration).toHaveBeenCalledWith(42, 'CDM_V5')
        expect(listCharacterizationExecutions).toHaveBeenCalledWith(42)
      })

      it('rethrows and sets error on failure', async () => {
        const store = useCharacterizationStore()
        vi.mocked(cancelCharacterizationGeneration).mockRejectedValue(new Error('Cant'))

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
          .mockResolvedValueOnce({ ...baseExec, id: 300, status: 'RUNNING' })
          .mockResolvedValueOnce({ ...baseExec, id: 300, status: 'COMPLETED' })

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
        vi.mocked(getCharacterizationExecution).mockResolvedValue({
          ...baseExec,
          id: 400,
          status: 'RUNNING',
        })

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
    })
  })
})
