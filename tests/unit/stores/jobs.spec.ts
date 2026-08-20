/**
 * Unit Tests: Jobs Store
 *
 * Tests for the jobs Pinia store
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useJobsStore } from '@/stores/jobs'
import { ApiError } from '@/services/api-error'

// Mock jobs service
vi.mock('@/services/jobs.service', () => ({
  jobsService: {
    getJobs: vi.fn()
  }
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('JobsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial state', () => {
    it('has correct initial state', () => {
      const store = useJobsStore()

      expect(store.jobs).toEqual([])
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.pollingEnabled).toBe(false)
      expect(store.statusFilter).toBe('all')
      expect(store.lastFetched).toBeNull()
    })
  })

  describe('fetchJobs', () => {
    it('fetches jobs successfully', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'RUNNING', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 2, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({
        success: true,
        data: mockJobs
      })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual(mockJobs)
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.lastFetched).toBeInstanceOf(Date)
    })

    it('handles fetch error from service', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({
        success: false,
        error: new ApiError('Service error', 0, null)
      })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.jobs).toEqual([])
      expect(store.error).toBe('Service error')
      expect(store.isLoading).toBe(false)
    })

    it('handles thrown exception', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockRejectedValue(new Error('Network failure'))

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.error).toBe('Network failure')
      expect(store.isLoading).toBe(false)
    })

    it('sets isLoading during fetch', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      let resolvePromise: (value: unknown) => void
      const promise = new Promise(resolve => {
        resolvePromise = resolve
      })
      vi.mocked(jobsService.getJobs).mockReturnValue(promise as Promise<ReturnType<typeof jobsService.getJobs>>)

      const store = useJobsStore()
      const fetchPromise = store.fetchJobs()

      expect(store.isLoading).toBe(true)

      resolvePromise!({ success: true, data: [] })
      await fetchPromise

      expect(store.isLoading).toBe(false)
    })
  })

  describe('filteredJobs', () => {
    it('returns all jobs when filter is "all"', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'RUNNING', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 2, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()
      store.setStatusFilter('all')

      expect(store.filteredJobs).toHaveLength(2)
    })

    it('filters running jobs', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'RUNNING', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 2, sourceKey: 'CDM', exitMessage: null },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'STARTED', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 3, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()
      store.setStatusFilter('running')

      expect(store.filteredJobs).toHaveLength(2)
      expect(store.filteredJobs.every(j => ['RUNNING', 'STARTED', 'STARTING', 'PENDING', 'STOPPING'].includes(j.status))).toBe(true)
    })

    it('filters completed jobs', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'COMPLETE', author: '', startTime: new Date(), endTime: new Date(), duration: 500, entityId: 2, sourceKey: 'CDM', exitMessage: null },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'FAILED', author: '', startTime: new Date(), endTime: new Date(), duration: 100, entityId: 3, sourceKey: 'CDM', exitMessage: 'Error' }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()
      store.setStatusFilter('completed')

      expect(store.filteredJobs).toHaveLength(2)
      expect(store.filteredJobs.every(j => ['COMPLETED', 'COMPLETE'].includes(j.status))).toBe(true)
    })

    it('filters failed jobs', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'FAILED', author: '', startTime: new Date(), endTime: new Date(), duration: 100, entityId: 1, sourceKey: 'CDM', exitMessage: 'Error' },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'ABANDONED', author: '', startTime: new Date(), endTime: new Date(), duration: 50, entityId: 2, sourceKey: 'CDM', exitMessage: 'Abandoned' },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 3, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()
      store.setStatusFilter('failed')

      expect(store.filteredJobs).toHaveLength(2)
      expect(store.filteredJobs.every(j => ['FAILED', 'ABANDONED'].includes(j.status))).toBe(true)
    })
  })

  describe('computed counts', () => {
    it('computes runningJobsCount correctly', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'RUNNING', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'STARTED', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 2, sourceKey: 'CDM', exitMessage: null },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 3, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.runningJobsCount).toBe(2)
    })

    it('computes completedJobsCount correctly', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'COMPLETE', author: '', startTime: new Date(), endTime: new Date(), duration: 500, entityId: 2, sourceKey: 'CDM', exitMessage: null },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'FAILED', author: '', startTime: new Date(), endTime: new Date(), duration: 100, entityId: 3, sourceKey: 'CDM', exitMessage: 'Error' }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.completedJobsCount).toBe(2)
    })

    it('computes failedJobsCount correctly', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'FAILED', author: '', startTime: new Date(), endTime: new Date(), duration: 100, entityId: 1, sourceKey: 'CDM', exitMessage: 'Error' },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'ABANDONED', author: '', startTime: new Date(), endTime: new Date(), duration: 50, entityId: 2, sourceKey: 'CDM', exitMessage: 'Abandoned' },
        { id: 3, executionId: 3, type: 'irAnalysis', name: 'Job 3', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 3, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.failedJobsCount).toBe(2)
    })

    it('computes hasJobs correctly', async () => {
      const { jobsService } = await import('@/services/jobs.service')

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      expect(store.hasJobs).toBe(false)

      vi.mocked(jobsService.getJobs).mockResolvedValue({
        success: true,
        data: [{ id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null }]
      })
      await store.fetchJobs()

      expect(store.hasJobs).toBe(true)
    })
  })

  describe('polling', () => {
    it('starts polling', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      store.startPolling()

      expect(store.pollingEnabled).toBe(true)
    })

    it('stops polling', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      store.startPolling()
      store.stopPolling()

      expect(store.pollingEnabled).toBe(false)
    })

    it('togglePolling toggles state', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      expect(store.pollingEnabled).toBe(false)

      store.togglePolling()
      expect(store.pollingEnabled).toBe(true)

      store.togglePolling()
      expect(store.pollingEnabled).toBe(false)
    })

    it('does not start duplicate polling', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      store.startPolling()
      store.startPolling() // Call again

      expect(store.pollingEnabled).toBe(true)
      // Should not cause issues
    })

    it('fetches jobs on polling interval', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      store.startPolling()

      // Advance timer by polling interval (2000ms)
      await vi.advanceTimersByTimeAsync(2000)

      expect(jobsService.getJobs).toHaveBeenCalled()
    })
  })

  describe('getJobById', () => {
    it('returns job by id', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null },
        { id: 2, executionId: 2, type: 'irAnalysis', name: 'Job 2', status: 'RUNNING', author: '', startTime: new Date(), endTime: null, duration: null, entityId: 2, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()

      const job = store.getJobById(2)
      expect(job?.name).toBe('Job 2')
    })

    it('returns undefined for non-existent job', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: [] })

      const store = useJobsStore()
      await store.fetchJobs()

      const job = store.getJobById(999)
      expect(job).toBeUndefined()
    })
  })

  describe('clearJobs', () => {
    it('clears all jobs and state', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()

      expect(store.jobs).toHaveLength(1)
      expect(store.lastFetched).not.toBeNull()

      store.clearJobs()

      expect(store.jobs).toHaveLength(0)
      expect(store.error).toBeNull()
      expect(store.lastFetched).toBeNull()
    })
  })

  describe('dispose', () => {
    it('stops polling and clears jobs', async () => {
      const { jobsService } = await import('@/services/jobs.service')
      const mockJobs = [
        { id: 1, executionId: 1, type: 'generateCohort', name: 'Job 1', status: 'COMPLETED', author: '', startTime: new Date(), endTime: new Date(), duration: 1000, entityId: 1, sourceKey: 'CDM', exitMessage: null }
      ]

      vi.mocked(jobsService.getJobs).mockResolvedValue({ success: true, data: mockJobs })

      const store = useJobsStore()
      await store.fetchJobs()
      store.startPolling()

      expect(store.pollingEnabled).toBe(true)
      expect(store.jobs).toHaveLength(1)

      store.dispose()

      expect(store.pollingEnabled).toBe(false)
      expect(store.jobs).toHaveLength(0)
    })
  })

  describe('setStatusFilter', () => {
    it('sets status filter', () => {
      const store = useJobsStore()

      store.setStatusFilter('running')
      expect(store.statusFilter).toBe('running')

      store.setStatusFilter('completed')
      expect(store.statusFilter).toBe('completed')

      store.setStatusFilter('failed')
      expect(store.statusFilter).toBe('failed')

      store.setStatusFilter('all')
      expect(store.statusFilter).toBe('all')
    })
  })
})
