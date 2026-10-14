import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { CDMSource, CohortGenerationInfo, GenerationJob } from '@/models/webapi.types'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { useWebAPIStore } from '@/stores/webapi'
import * as cohortDefService from '@/services/cohort-definition.service'
import * as sourceService from '@/services/source.service'
import { logger } from '@/utils/logger'

vi.mock('@/services/cohort-definition.service', () => ({
  generateCohort: vi.fn(),
  getCohortGenerationInfo: vi.fn(),
}))

vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const SOURCE: CDMSource = {
  sourceId: 5,
  sourceKey: 'SRC',
  sourceName: 'SRC',
  sourceDialect: 'postgresql',
  daimons: [{ sourceDaimonId: 1, daimonType: 'Results', tableQualifier: 'r', priority: 0 }],
}

const job = (overrides: Partial<GenerationJob> = {}): GenerationJob => ({
  id: 5,
  cohortDefinitionId: 123,
  sourceKey: 'SRC',
  status: 'PENDING',
  ...overrides,
})

describe('WebAPI store generation and source-list failure paths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('fetchSources', () => {
    it('keeps the current selection when the API reports a failure', async () => {
      const store = useWebAPIStore()
      store.setSources([SOURCE])
      vi.mocked(sourceService.fetchCDMSources).mockResolvedValue(
        failure(new ApiError('down', 500, null))
      )

      await store.fetchSources()

      expect(store.selectedSource).toBe('SRC')
      expect(logger.error).toHaveBeenCalled()
      expect(store.isLoadingSources).toBe(false)
    })

    it('keeps the current selection when the request throws', async () => {
      const store = useWebAPIStore()
      store.setSources([SOURCE])
      vi.mocked(sourceService.fetchCDMSources).mockRejectedValue(new Error('network'))

      await store.fetchSources()

      expect(store.selectedSource).toBe('SRC')
      expect(store.isLoadingSources).toBe(false)
    })
  })

  describe('sources without daimon details', () => {
    it('tolerates sources with no daimons or priorities', () => {
      const store = useWebAPIStore()
      const bare = { sourceId: 1, sourceKey: 'BARE', sourceName: 'BARE', sourceDialect: 'x' } as unknown as CDMSource
      const noPriority = {
        ...SOURCE,
        sourceId: 2,
        sourceKey: 'NOPRI',
        daimons: [{ sourceDaimonId: 9, daimonType: 'Results', tableQualifier: 'r' }],
      } as unknown as CDMSource

      store.setSources([bare, noPriority])

      expect(store.resultsSources.map(s => s.sourceKey)).toEqual(['NOPRI'])
      expect(store.selectedSource).toBe('NOPRI')
    })
  })

  describe('generateCohort for a known source', () => {
    beforeEach(() => {
      useWebAPIStore().setSources([SOURCE])
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success([]))
    })

    it('marks the job FAILED with the API message when the request is rejected', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockResolvedValue(
        failure(new ApiError('Rejected by server', 500, null))
      )

      expect(await store.generateCohort(123, 'SRC')).toBeNull()

      expect(store.getJobById(5)).toMatchObject({ status: 'FAILED', failMessage: 'Rejected by server' })
    })

    it('marks the job FAILED with the error message when the request throws', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockRejectedValue(new Error('socket closed'))

      expect(await store.generateCohort(123, 'SRC')).toBeNull()

      expect(store.getJobById(5)).toMatchObject({ status: 'FAILED', failMessage: 'socket closed' })
    })

    it('uses a generic message when the thrown value is not an Error', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockRejectedValue('nope')

      await store.generateCohort(123, 'SRC')

      expect(store.getJobById(5)).toMatchObject({ status: 'FAILED', failMessage: 'Generation failed' })
    })

    it('keys the started job by the source id', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockResolvedValue(success(job({ id: 999 })))

      await store.generateCohort(123, 'SRC')
      store.stopAllPolling()

      expect(store.getJobById(5)).toMatchObject({ id: 5, sourceKey: 'SRC' })
      expect(store.getJobById(999)).toBeUndefined()
    })
  })

  describe('generateCohort for an unknown source', () => {
    it('records no job when the request is rejected', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockResolvedValue(
        failure(new ApiError('Rejected', 500, null))
      )

      expect(await store.generateCohort(123, 'GONE')).toBeNull()

      expect(store.generationJobs.size).toBe(0)
    })

    it('records no job when the request throws', async () => {
      const store = useWebAPIStore()
      vi.mocked(cohortDefService.generateCohort).mockRejectedValue(new Error('boom'))

      expect(await store.generateCohort(123, 'GONE')).toBeNull()

      expect(store.generationJobs.size).toBe(0)
    })
  })

  describe('generation status polling', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('stamps an end time when a finished job reports no timing', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ status: 'RUNNING' }))
      const info: CohortGenerationInfo[] = [
        { id: { cohortDefinitionId: 123, sourceId: 5 }, status: 'COMPLETE' },
      ]
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success(info))

      const polling = store.pollGenerationStatus(123)
      await vi.runOnlyPendingTimersAsync()
      await polling

      expect(store.getJobById(5)?.status).toBe('COMPLETE')
      expect(store.getJobById(5)?.endTime).toBeDefined()
    })

    it('stamps an end time when a finished job has a start time but no duration', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ status: 'RUNNING' }))
      const info: CohortGenerationInfo[] = [
        { id: { cohortDefinitionId: 123, sourceId: 5 }, status: 'FAILED', startTime: 1000, failMessage: 'x' },
      ]
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success(info))

      const polling = store.pollGenerationStatus(123)
      await vi.runOnlyPendingTimersAsync()
      await polling

      expect(store.getJobById(5)).toMatchObject({ status: 'FAILED', failMessage: 'x' })
      expect(store.getJobById(5)?.endTime).toBeDefined()
    })

    it('computes the end time from start time and duration', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ status: 'RUNNING' }))
      const info: CohortGenerationInfo[] = [
        { id: { cohortDefinitionId: 123, sourceId: 5 }, status: 'COMPLETE', startTime: 1000, executionDuration: 500 },
      ]
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success(info))

      const polling = store.pollGenerationStatus(123)
      await vi.runOnlyPendingTimersAsync()
      await polling

      expect(store.getJobById(5)?.endTime).toBe(new Date(1500).toISOString())
    })

    it('gives up after the polling timeout while the status request keeps failing', async () => {
      const store = useWebAPIStore()
      store.addGenerationJob(job({ status: 'RUNNING' }))
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(
        failure(new ApiError('unavailable', 503, null))
      )

      const polling = store.pollGenerationStatus(123)
      await vi.advanceTimersByTimeAsync(store.POLL_TIMEOUT_MS + 10_000)
      await polling

      expect(logger.warn).toHaveBeenCalledWith('WebAPIStore', expect.stringContaining('timeout'))
      expect(store.getJobById(5)?.status).toBe('RUNNING')
    })
  })

  describe('fetchCohortGenerationInfo', () => {
    it('leaves the end time unset when only a start time is known', async () => {
      const store = useWebAPIStore()
      store.setSources([SOURCE])
      const info: CohortGenerationInfo[] = [
        { id: { cohortDefinitionId: 123, sourceId: 5 }, status: 'RUNNING', startTime: 1000 },
      ]
      vi.mocked(cohortDefService.getCohortGenerationInfo).mockResolvedValue(success(info))

      await store.fetchCohortGenerationInfo(123)

      expect(store.getJobById(5)).toMatchObject({ status: 'RUNNING', endTime: undefined })
    })
  })
})
