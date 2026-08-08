/**
 * Feature Analyses Store Tests
 *
 * Happy path + error path coverage for the CRUD actions and the metadata
 * loaders. Service layer is mocked.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useFeatureAnalysesStore } from '@/stores/feature-analyses'
import type {
  FeatureAnalysis,
  FeatureAnalysisListItem,
  FeatureAnalysisAggregate,
} from '@/models/feature-analysis.types'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'

// Mock service layer
vi.mock('@/services/feature-analysis.service', () => ({
  listFeatureAnalyses: vi.fn(),
  getFeatureAnalysis: vi.fn(),
  createFeatureAnalysis: vi.fn(),
  updateFeatureAnalysis: vi.fn(),
  deleteFeatureAnalysis: vi.fn(),
  copyFeatureAnalysis: vi.fn(),
  listFeatureAnalysisDomains: vi.fn(),
  listFeatureAnalysisAggregates: vi.fn(),
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
  listFeatureAnalyses,
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  deleteFeatureAnalysis,
  copyFeatureAnalysis,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
} from '@/services/feature-analysis.service'

function apiErr(message: string, status = 0) {
  return failure(new ApiError(message, status, null))
}

const mockList: FeatureAnalysisListItem[] = [
  {
    id: 1,
    name: 'Demographics PRESET',
    type: 'PRESET',
    domain: 'Demographics',
    statType: 'PREVALENCE',
  },
  {
    id: 2,
    name: 'Conditions Criteria',
    type: 'CRITERIA_SET',
    domain: 'Condition',
    statType: 'PREVALENCE',
  },
  {
    id: 3,
    name: 'Custom SQL Drug Counts',
    type: 'CUSTOM_FE',
    domain: 'Drug',
    statType: 'DISTRIBUTION',
  },
]

const mockFA: FeatureAnalysis = {
  id: 1,
  name: 'Demographics PRESET',
  type: 'PRESET',
  domain: 'Demographics',
  statType: 'PREVALENCE',
  design: { settings: 'opaque' },
}

const mockAggregates: FeatureAnalysisAggregate[] = [
  { id: 1, name: 'Events count', expression: '*', function: 'COUNT' },
  { id: 2, name: 'Distinct start dates', function: 'COUNT' },
]

describe('Feature Analyses Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial state', () => {
    it('should start with empty list', () => {
      const store = useFeatureAnalysesStore()
      expect(store.featureAnalyses).toEqual([])
      expect(store.currentFA).toBeNull()
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.filterTerm).toBe('')
      expect(store.domains).toEqual([])
      expect(store.aggregates).toEqual([])
    })
  })

  describe('Getters', () => {
    it('filteredFeatureAnalyses returns all when no filter term', () => {
      const store = useFeatureAnalysesStore()
      store.featureAnalyses = mockList
      expect(store.filteredFeatureAnalyses).toEqual(mockList)
    })

    it('filteredFeatureAnalyses filters by name (case-insensitive)', () => {
      const store = useFeatureAnalysesStore()
      store.featureAnalyses = mockList
      store.filterTerm = 'CUSTOM'
      expect(store.filteredFeatureAnalyses).toEqual([mockList[2]])
    })

    it('isEmpty is true when list empty', () => {
      const store = useFeatureAnalysesStore()
      expect(store.isEmpty).toBe(true)
    })

    it('isEmpty is false when list populated', () => {
      const store = useFeatureAnalysesStore()
      store.featureAnalyses = mockList
      expect(store.isEmpty).toBe(false)
    })
  })

  describe('fetchAll', () => {
    it('populates list on success', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(listFeatureAnalyses).mockResolvedValue(success(mockList))

      await store.fetchAll()

      expect(store.featureAnalyses).toEqual(mockList)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('sets loading while in flight', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(listFeatureAnalyses).mockImplementation(() => new Promise(() => {}))

      const _p = store.fetchAll()
      expect(store.loading).toBe(true)
    })

    it('skips when already loading', async () => {
      const store = useFeatureAnalysesStore()
      store.loading = true

      await store.fetchAll()

      expect(listFeatureAnalyses).not.toHaveBeenCalled()
    })

    it('captures error and resets list on failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(listFeatureAnalyses).mockResolvedValue(apiErr('Network down'))

      await store.fetchAll()

      expect(store.error).toBe('Network down')
      expect(store.featureAnalyses).toEqual([])
      expect(store.loading).toBe(false)
    })
  })

  describe('fetchOne', () => {
    it('populates currentFA on success', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(getFeatureAnalysis).mockResolvedValue(success(mockFA))

      await store.fetchOne(1)

      expect(store.currentFA).toEqual(mockFA)
    })

    it('captures error on failure (e.g. not found)', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(getFeatureAnalysis).mockResolvedValue(apiErr('Feature analysis not found', 404))

      await store.fetchOne(999)

      expect(store.error).toBe('Feature analysis not found')
      expect(store.currentFA).toBeNull()
    })

    it('captures error on generic failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(getFeatureAnalysis).mockResolvedValue(apiErr('Boom'))

      await store.fetchOne(1)

      expect(store.error).toBe('Boom')
      expect(store.currentFA).toBeNull()
    })
  })

  describe('create', () => {
    it('creates and refreshes list', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(createFeatureAnalysis).mockResolvedValue(success(mockFA))
      vi.mocked(listFeatureAnalyses).mockResolvedValue(success(mockList))

      const result = await store.create(mockFA)

      expect(result).toEqual(mockFA)
      expect(store.currentFA).toEqual(mockFA)
    })

    it('returns null and sets error on failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(createFeatureAnalysis).mockResolvedValue(apiErr('Server error'))

      const result = await store.create(mockFA)

      expect(result).toBeNull()
      expect(store.error).toBe('Server error')
    })
  })

  describe('update', () => {
    it('updates and refreshes list', async () => {
      const store = useFeatureAnalysesStore()
      const updated = { ...mockFA, name: 'Renamed' }
      vi.mocked(updateFeatureAnalysis).mockResolvedValue(success(updated))
      vi.mocked(listFeatureAnalyses).mockResolvedValue(success(mockList))

      const result = await store.update(updated)

      expect(result).toEqual(updated)
      expect(store.currentFA).toEqual(updated)
    })

    it('returns null and sets error on failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(updateFeatureAnalysis).mockResolvedValue(apiErr('Conflict'))

      const result = await store.update(mockFA)

      expect(result).toBeNull()
      expect(store.error).toBe('Conflict')
    })
  })

  describe('remove', () => {
    it('removes from list on success', async () => {
      const store = useFeatureAnalysesStore()
      store.featureAnalyses = [...mockList]
      vi.mocked(deleteFeatureAnalysis).mockResolvedValue(success(undefined))

      const result = await store.remove(1)

      expect(result).toBe(true)
      expect(store.featureAnalyses.find((fa) => fa.id === 1)).toBeUndefined()
    })

    it('clears currentFA when deleted item was selected', async () => {
      const store = useFeatureAnalysesStore()
      store.featureAnalyses = [...mockList]
      store.currentFA = { ...mockFA }
      vi.mocked(deleteFeatureAnalysis).mockResolvedValue(success(undefined))

      await store.remove(1)

      expect(store.currentFA).toBeNull()
    })

    it('returns false and sets error on failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(deleteFeatureAnalysis).mockResolvedValue(apiErr('Gone'))

      const result = await store.remove(1)

      expect(result).toBe(false)
      expect(store.error).toBe('Gone')
    })
  })

  describe('copy', () => {
    it('copies, refreshes, and sets currentFA', async () => {
      const store = useFeatureAnalysesStore()
      const copied = { ...mockFA, id: 42, name: 'COPY OF Demographics PRESET' }
      vi.mocked(copyFeatureAnalysis).mockResolvedValue(success(copied))
      vi.mocked(listFeatureAnalyses).mockResolvedValue(success(mockList))

      const result = await store.copy(1)

      expect(result).toEqual(copied)
      expect(store.currentFA).toEqual(copied)
    })

    it('returns null and sets error on failure', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(copyFeatureAnalysis).mockResolvedValue(apiErr('Nope'))

      const result = await store.copy(1)

      expect(result).toBeNull()
      expect(store.error).toBe('Nope')
    })
  })

  describe('setFilter (debounced)', () => {
    it('updates filterTerm after debounce window', () => {
      vi.useFakeTimers()
      const store = useFeatureAnalysesStore()

      store.setFilter('preset')
      expect(store.filterTerm).toBe('')

      vi.advanceTimersByTime(300)
      expect(store.filterTerm).toBe('preset')

      vi.useRealTimers()
    })
  })

  describe('loadDomains', () => {
    it('populates domains on first call', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(listFeatureAnalysisDomains).mockResolvedValue(success(['Condition', 'Drug']))

      await store.loadDomains()

      expect(store.domains).toEqual(['Condition', 'Drug'])
    })

    it('is a no-op when already populated', async () => {
      const store = useFeatureAnalysesStore()
      store.domains = ['Already']

      await store.loadDomains()

      expect(listFeatureAnalysisDomains).not.toHaveBeenCalled()
    })
  })

  describe('loadAggregates', () => {
    it('populates aggregates on first call', async () => {
      const store = useFeatureAnalysesStore()
      vi.mocked(listFeatureAnalysisAggregates).mockResolvedValue(success(mockAggregates))

      await store.loadAggregates()

      expect(store.aggregates).toEqual(mockAggregates)
    })

    it('is a no-op when already populated', async () => {
      const store = useFeatureAnalysesStore()
      store.aggregates = mockAggregates

      await store.loadAggregates()

      expect(listFeatureAnalysisAggregates).not.toHaveBeenCalled()
    })
  })

  describe('clearError / clearCurrent', () => {
    it('clearError resets error', () => {
      const store = useFeatureAnalysesStore()
      store.error = 'something'
      store.clearError()
      expect(store.error).toBeNull()
    })

    it('clearCurrent resets currentFA', () => {
      const store = useFeatureAnalysesStore()
      store.currentFA = { ...mockFA }
      store.clearCurrent()
      expect(store.currentFA).toBeNull()
    })
  })
})
