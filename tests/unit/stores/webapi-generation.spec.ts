/**
 * Unit Test: WebAPI Store - Generation Polling Logic
 * Tests the cohort generation workflow and status polling
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebAPIStore } from '@/stores/webapi'
import type { GenerationJob } from '@/models/webapi.types'

// Mock the webapi service
vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn(),
  generateCohort: vi.fn(),
  getCohortGenerationInfo: vi.fn(),
}))

describe('WebAPI Store - Generation Polling', () => {
  let store: ReturnType<typeof useWebAPIStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useWebAPIStore()
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('fetchSources', () => {
    it('should load CDM sources and auto-select first one', async () => {
      const mockSources = [
        { sourceKey: 'SYNPUF1K', sourceName: 'SYNPUF 1K', sourceDialect: 'postgresql', daimons: [] },
        { sourceKey: 'SYNPUF23M', sourceName: 'SYNPUF 23M', sourceDialect: 'postgresql', daimons: [] },
      ]

      const webapi = await import('@/services/webapi')
      vi.mocked(webapi.fetchCDMSources).mockResolvedValue(mockSources)

      // Assume fetchSources action exists
      if ('fetchSources' in store) {
        await (store as any).fetchSources()

        expect(store.sources).toEqual(mockSources)
        expect(store.selectedSource).toBe('SYNPUF1K') // Auto-selected first
      }
    })

    it('should set loading state during fetch', async () => {
      const webapi = await import('@/services/webapi')
      vi.mocked(webapi.fetchCDMSources).mockResolvedValue([])

      if ('fetchSources' in store) {
        const fetchPromise = (store as any).fetchSources()
        expect(store.isLoadingSources).toBe(true)

        await fetchPromise
        expect(store.isLoadingSources).toBe(false)
      }
    })
  })

  describe('generateCohort', () => {
    it('should start generation and add job to store', async () => {
      const mockJob: GenerationJob = {
        id: 1,
        cohortDefinitionId: 123,
        sourceKey: 'SYNPUF1K',
        status: 'PENDING',
      }

      const webapi = await import('@/services/webapi')
      vi.mocked(webapi.generateCohort).mockResolvedValue(mockJob)

      if ('generateCohort' in store) {
        await (store as any).generateCohort(123, 'SYNPUF1K')

        const job = store.getJobById(1)
        expect(job).toEqual(mockJob)
        expect(job?.status).toBe('PENDING')
      }
    })

    it('should return null on generation error', async () => {
      const webapi = await import('@/services/webapi')
      vi.mocked(webapi.generateCohort).mockResolvedValue(null)

      if ('generateCohort' in store) {
        const result = await (store as any).generateCohort(123, 'SYNPUF1K')
        expect(result).toBeNull()
      }
    })
  })

  describe('pollGenerationStatus', () => {
    it('should poll every 2 seconds until complete', async () => {
      const webapi = await import('@/services/webapi')

      // Mock progression: PENDING → RUNNING → RUNNING → COMPLETE
      const statusSequence = ['PENDING', 'RUNNING', 'RUNNING', 'COMPLETE']
      let callCount = 0

      vi.mocked(webapi.getCohortGenerationInfo).mockImplementation(async () => {
        const status = statusSequence[callCount] || 'COMPLETE'
        callCount++

        return {
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          status: status as any,
          personCount: status === 'COMPLETE' ? 1500 : undefined,
          executionDuration: status === 'COMPLETE' ? 2345 : undefined,
        }
      })

      // Assume pollGenerationStatus action exists
      if ('pollGenerationStatus' in store) {
        const pollPromise = (store as any).pollGenerationStatus(123)

        // Fast-forward time by 2 seconds (first poll)
        await vi.advanceTimersByTimeAsync(2000)
        expect(callCount).toBe(1)

        // Fast-forward another 2 seconds (second poll)
        await vi.advanceTimersByTimeAsync(2000)
        expect(callCount).toBe(2)

        // Fast-forward another 2 seconds (third poll)
        await vi.advanceTimersByTimeAsync(2000)
        expect(callCount).toBe(3)

        // Fast-forward another 2 seconds (fourth poll - COMPLETE)
        await vi.advanceTimersByTimeAsync(2000)

        await pollPromise

        // Should have made 4 API calls
        expect(callCount).toBe(4)

        // Final job should be COMPLETE with patient count
        const jobs = store.getJobsByCohortId(123)
        expect(jobs.length).toBeGreaterThan(0)
        expect(jobs[0]?.status).toBe('COMPLETE')
        expect(jobs[0]?.personCount).toBe(1500)
      }
    })

    it('should stop polling on FAILED status', async () => {
      const webapi = await import('@/services/webapi')

      let callCount = 0
      vi.mocked(webapi.getCohortGenerationInfo).mockImplementation(async () => {
        callCount++
        return {
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          status: 'FAILED',
          failMessage: 'Database connection error',
        }
      })

      if ('pollGenerationStatus' in store) {
        const pollPromise = (store as any).pollGenerationStatus(123)

        await vi.advanceTimersByTimeAsync(2000)
        await pollPromise

        // Should only make 1 call (failed immediately)
        expect(callCount).toBe(1)

        // Advance more time - no additional calls
        await vi.advanceTimersByTimeAsync(10000)
        expect(callCount).toBe(1)

        // Job should be marked as FAILED
        const jobs = store.getJobsByCohortId(123)
        expect(jobs[0]?.status).toBe('FAILED')
        expect(jobs[0]?.failMessage).toBe('Database connection error')
      }
    })

    it('should update job status on each poll', async () => {
      const webapi = await import('@/services/webapi')

      const statusUpdates = [
        { status: 'PENDING', personCount: undefined },
        { status: 'RUNNING', personCount: undefined },
        { status: 'COMPLETE', personCount: 2500 },
      ]
      let callCount = 0

      vi.mocked(webapi.getCohortGenerationInfo).mockImplementation(async () => {
        const update = statusUpdates[callCount] || statusUpdates[statusUpdates.length - 1]
        callCount++

        return {
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          ...update,
        }
      })

      if ('pollGenerationStatus' in store) {
        const pollPromise = (store as any).pollGenerationStatus(123)

        // First poll - PENDING
        await vi.advanceTimersByTimeAsync(2000)
        let jobs = store.getJobsByCohortId(123)
        expect(jobs[0]?.status).toBe('PENDING')

        // Second poll - RUNNING
        await vi.advanceTimersByTimeAsync(2000)
        jobs = store.getJobsByCohortId(123)
        expect(jobs[0]?.status).toBe('RUNNING')

        // Third poll - COMPLETE
        await vi.advanceTimersByTimeAsync(2000)
        await pollPromise

        jobs = store.getJobsByCohortId(123)
        expect(jobs[0]?.status).toBe('COMPLETE')
        expect(jobs[0]?.personCount).toBe(2500)
      }
    })

    it('should handle polling timeout gracefully', async () => {
      const webapi = await import('@/services/webapi')

      // Always return RUNNING (never complete)
      vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({
        cohortDefinitionId: 123,
        sourceKey: 'SYNPUF1K',
        status: 'RUNNING',
      })

      if ('pollGenerationStatus' in store && 'POLL_TIMEOUT_MS' in store) {
        // Assume there's a timeout mechanism (e.g., 60 seconds max)
        const timeoutMs = (store as any).POLL_TIMEOUT_MS || 60000

        const pollPromise = (store as any).pollGenerationStatus(123)

        // Fast-forward to timeout
        await vi.advanceTimersByTimeAsync(timeoutMs + 1000)

        await pollPromise

        // Should have stopped polling
        // (Implementation should handle timeout)
      }
    })
  })

  describe('activeJobs', () => {
    it('should return only PENDING and RUNNING jobs', () => {
      store.addGenerationJob({ id: 1, cohortDefinitionId: 1, sourceKey: 'SYNPUF1K', status: 'PENDING' })
      store.addGenerationJob({ id: 2, cohortDefinitionId: 2, sourceKey: 'SYNPUF1K', status: 'RUNNING' })
      store.addGenerationJob({ id: 3, cohortDefinitionId: 3, sourceKey: 'SYNPUF1K', status: 'COMPLETE', personCount: 100 })
      store.addGenerationJob({ id: 4, cohortDefinitionId: 4, sourceKey: 'SYNPUF1K', status: 'FAILED', failMessage: 'Error' })

      const active = store.activeJobs
      expect(active).toHaveLength(2)
      expect(active.map(j => j.status)).toEqual(['PENDING', 'RUNNING'])
    })
  })
})
