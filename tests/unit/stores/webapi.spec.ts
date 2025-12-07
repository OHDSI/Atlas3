/**
 * WebAPI Store Tests
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebAPIStore } from '@/stores/webapi'
import type { CDMSource, GenerationJob, CohortGenerationInfo } from '@/models/webapi.types'
import * as webapi from '@/services/webapi'

// Mock the webapi service
vi.mock('@/services/webapi', () => ({
  fetchCDMSources: vi.fn(),
  generateCohort: vi.fn(),
  getCohortGenerationInfo: vi.fn(),
}))

// Mock logger to prevent console output during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('WebAPI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty sources initially', () => {
      const store = useWebAPIStore()
      expect(store.sources).toEqual([])
      expect(store.selectedSource).toBeNull()
    })

    it('should have empty generation jobs initially', () => {
      const store = useWebAPIStore()
      expect(store.generationJobs.size).toBe(0)
    })

    it('should not be loading sources initially', () => {
      const store = useWebAPIStore()
      expect(store.isLoadingSources).toBe(false)
    })
  })

  describe('Getters', () => {
    describe('sourcesList', () => {
      it('should return the sources array', () => {
        const store = useWebAPIStore()
        const sources: CDMSource[] = [
          {
            sourceId: 1,
            sourceKey: 'source1',
            sourceName: 'Test Source 1',
            sourceDialect: 'postgresql',
            daimons: [],
          },
        ]
        store.setSources(sources)

        expect(store.sourcesList).toEqual(sources)
      })
    })

    describe('currentSource', () => {
      it('should return null when no source is selected', () => {
        const store = useWebAPIStore()
        expect(store.currentSource).toBeNull()
      })

      it('should return the selected source', () => {
        const store = useWebAPIStore()
        const sources: CDMSource[] = [
          {
            sourceId: 1,
            sourceKey: 'source1',
            sourceName: 'Test Source 1',
            sourceDialect: 'postgresql',
            daimons: [],
          },
          {
            sourceId: 2,
            sourceKey: 'source2',
            sourceName: 'Test Source 2',
            sourceDialect: 'postgresql',
            daimons: [],
          },
        ]
        store.setSources(sources)
        store.setSelectedSource('source2')

        expect(store.currentSource).toEqual(sources[1])
      })

      it('should return null when selected source key does not exist', () => {
        const store = useWebAPIStore()
        const sources: CDMSource[] = [
          {
            sourceId: 1,
            sourceKey: 'source1',
            sourceName: 'Test Source 1',
            sourceDialect: 'postgresql',
            daimons: [],
          },
        ]
        store.setSources(sources)
        store.setSelectedSource('nonexistent')

        expect(store.currentSource).toBeNull()
      })
    })

    describe('activeJobs', () => {
      it('should return empty array when no jobs exist', () => {
        const store = useWebAPIStore()
        expect(store.activeJobs).toEqual([])
      })

      it('should return only PENDING and RUNNING jobs', () => {
        const store = useWebAPIStore()
        store.addGenerationJob({ id: 1, cohortDefinitionId: 1, sourceKey: 'test', status: 'PENDING' })
        store.addGenerationJob({ id: 2, cohortDefinitionId: 2, sourceKey: 'test', status: 'RUNNING' })
        store.addGenerationJob({ id: 3, cohortDefinitionId: 3, sourceKey: 'test', status: 'COMPLETE' })
        store.addGenerationJob({ id: 4, cohortDefinitionId: 4, sourceKey: 'test', status: 'FAILED' })

        const active = store.activeJobs
        expect(active).toHaveLength(2)
        expect(active.map(j => j.id)).toEqual([1, 2])
      })
    })

    describe('getJobById', () => {
      it('should return undefined when job does not exist', () => {
        const store = useWebAPIStore()
        expect(store.getJobById(999)).toBeUndefined()
      })

      it('should return the job with matching id', () => {
        const store = useWebAPIStore()
        const job: GenerationJob = {
          id: 123,
          cohortDefinitionId: 456,
          sourceKey: 'test',
          status: 'PENDING',
        }
        store.addGenerationJob(job)

        expect(store.getJobById(123)).toEqual(job)
      })
    })

    describe('getJobsByCohortId', () => {
      it('should return empty array when no jobs exist for cohort', () => {
        const store = useWebAPIStore()
        expect(store.getJobsByCohortId(999)).toEqual([])
      })

      it('should return all jobs for a specific cohort', () => {
        const store = useWebAPIStore()
        store.addGenerationJob({ id: 1, cohortDefinitionId: 100, sourceKey: 'source1', status: 'PENDING' })
        store.addGenerationJob({ id: 2, cohortDefinitionId: 100, sourceKey: 'source2', status: 'RUNNING' })
        store.addGenerationJob({ id: 3, cohortDefinitionId: 200, sourceKey: 'source1', status: 'COMPLETE' })

        const jobs = store.getJobsByCohortId(100)
        expect(jobs).toHaveLength(2)
        expect(jobs.map(j => j.id)).toEqual([1, 2])
      })
    })
  })

  describe('Sources Management', () => {
    it('should set sources', () => {
      const store = useWebAPIStore()
      const sources: CDMSource[] = [
        {
          sourceId: 1,
          sourceKey: 'source1',
          sourceName: 'Test Source 1',
          sourceDialect: 'postgresql',
          daimons: [],
        },
        {
          sourceId: 2,
          sourceKey: 'source2',
          sourceName: 'Test Source 2',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      store.setSources(sources)

      expect(store.sources).toEqual(sources)
      expect(store.selectedSource).toBe('source1') // Auto-selects first
    })

    it('should not auto-select if source already selected', () => {
      const store = useWebAPIStore()
      store.setSelectedSource('existing-source')

      const sources: CDMSource[] = [
        {
          sourceId: 1,
          sourceKey: 'source1',
          sourceName: 'Test Source 1',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      store.setSources(sources)

      expect(store.selectedSource).toBe('existing-source')
    })

    it('should handle empty sources array', () => {
      const store = useWebAPIStore()
      store.setSources([])

      expect(store.sources).toEqual([])
      expect(store.selectedSource).toBeNull()
    })

    it('should set selected source', () => {
      const store = useWebAPIStore()

      store.setSelectedSource('test-source')
      expect(store.selectedSource).toBe('test-source')
    })

    it('should set loading sources state', () => {
      const store = useWebAPIStore()

      store.setLoadingSources(true)
      expect(store.isLoadingSources).toBe(true)

      store.setLoadingSources(false)
      expect(store.isLoadingSources).toBe(false)
    })
  })

  describe('Generation Jobs Management', () => {
    it('should add generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)

      expect(store.generationJobs.size).toBe(1)
      expect(store.generationJobs.get(123)).toEqual(job)
    })

    it('should update generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)

      const updatedJob = {
        ...job,
        status: 'RUNNING' as const,
        personCount: 1000,
      }

      store.updateGenerationJob(123, updatedJob)

      expect(store.generationJobs.get(123)?.status).toBe('RUNNING')
      expect(store.generationJobs.get(123)?.personCount).toBe(1000)
    })

    it('should remove generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)
      expect(store.generationJobs.size).toBe(1)

      store.removeGenerationJob(123)
      expect(store.generationJobs.size).toBe(0)
    })

    it('should clear all generation jobs', () => {
      const store = useWebAPIStore()
      store.addGenerationJob({ id: 1, cohortDefinitionId: 1, sourceKey: 'test', status: 'PENDING' })
      store.addGenerationJob({ id: 2, cohortDefinitionId: 2, sourceKey: 'test', status: 'RUNNING' })
      expect(store.generationJobs.size).toBe(2)

      store.clearJobs()

      expect(store.generationJobs.size).toBe(0)
    })
  })

  describe('Async Actions', () => {
    describe('fetchSources', () => {
      it('should fetch sources successfully', async () => {
        const store = useWebAPIStore()
        const mockSources: CDMSource[] = [
          {
            sourceId: 1,
            sourceKey: 'SYNPUF1K',
            sourceName: 'SYNPUF 1K',
            sourceDialect: 'postgresql',
            daimons: [],
          },
        ]

        vi.mocked(webapi.fetchCDMSources).mockResolvedValue({ success: true, data: mockSources })

        await store.fetchSources()

        expect(store.sources).toEqual(mockSources)
        expect(store.selectedSource).toBe('SYNPUF1K')
      })

      it('should set loading state during fetch', async () => {
        vi.useFakeTimers()
        try {
          const store = useWebAPIStore()
          vi.mocked(webapi.fetchCDMSources).mockImplementation(
            () => new Promise(resolve => setTimeout(() => resolve({ success: true, data: [] }), 100))
          )

          const promise = store.fetchSources()
          expect(store.isLoadingSources).toBe(true)

          await vi.advanceTimersByTimeAsync(100)
          await promise
          expect(store.isLoadingSources).toBe(false)
        } finally {
          vi.useRealTimers()
        }
      })

      it('should handle fetch error', async () => {
        const store = useWebAPIStore()
        vi.mocked(webapi.fetchCDMSources).mockRejectedValue(new Error('Network error'))

        await store.fetchSources()

        expect(store.sources).toEqual([])
        expect(store.isLoadingSources).toBe(false)
      })
    })

    describe('generateCohort', () => {
      it('should generate cohort successfully', async () => {
        const store = useWebAPIStore()
        const mockJob: GenerationJob = {
          id: 1,
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          status: 'PENDING',
        }

        vi.mocked(webapi.generateCohort).mockResolvedValue(mockJob)
        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

        const result = await store.generateCohort(123, 'SYNPUF1K')

        expect(result).toEqual(mockJob)
        expect(store.getJobById(1)).toEqual(mockJob)
      })

      it('should update existing job status to PENDING before generating', async () => {
        const store = useWebAPIStore()
        const existingJob: GenerationJob = {
          id: 1,
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          status: 'COMPLETE',
        }
        store.addGenerationJob(existingJob)

        const mockJob: GenerationJob = {
          id: 2,
          cohortDefinitionId: 123,
          sourceKey: 'SYNPUF1K',
          status: 'PENDING',
        }

        vi.mocked(webapi.generateCohort).mockResolvedValue(mockJob)
        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

        await store.generateCohort(123, 'SYNPUF1K')

        // Should have updated the existing job to PENDING first
        expect(store.getJobById(1)?.status).toBe('PENDING')
      })

      it('should handle generate error', async () => {
        const store = useWebAPIStore()
        vi.mocked(webapi.generateCohort).mockRejectedValue(new Error('Generation failed'))

        const result = await store.generateCohort(123, 'SYNPUF1K')

        expect(result).toBeNull()
      })

      it('should return null when API returns null', async () => {
        const store = useWebAPIStore()
        vi.mocked(webapi.generateCohort).mockResolvedValue(null)

        const result = await store.generateCohort(123, 'SYNPUF1K')

        expect(result).toBeNull()
      })
    })

    describe('fetchCohortGenerationInfo', () => {
      beforeEach(() => {
        const store = useWebAPIStore()
        const sources: CDMSource[] = [
          {
            sourceId: 1,
            sourceKey: 'SYNPUF1K',
            sourceName: 'SYNPUF 1K',
            sourceDialect: 'postgresql',
            daimons: [],
          },
          {
            sourceId: 2,
            sourceKey: 'SYNPUF23M',
            sourceName: 'SYNPUF 23M',
            sourceDialect: 'postgresql',
            daimons: [],
          },
        ]
        store.setSources(sources)
      })

      it('should fetch and convert generation info to jobs', async () => {
        const store = useWebAPIStore()
        const mockInfo: CohortGenerationInfo[] = [
          {
            id: { cohortDefinitionId: 123, sourceId: 1 },
            status: 'COMPLETE',
            startTime: 1000000,
            executionDuration: 5000,
            personCount: 1000,
            recordCount: 5000,
          },
        ]

        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

        await store.fetchCohortGenerationInfo(123)

        const jobs = store.getJobsByCohortId(123)
        expect(jobs).toHaveLength(1)
        expect(jobs[0]?.status).toBe('COMPLETE')
        expect(jobs[0]?.sourceKey).toBe('SYNPUF1K')
        expect(jobs[0]?.personCount).toBe(1000)
      })

      it('should handle multiple generation info entries', async () => {
        const store = useWebAPIStore()
        const mockInfo: CohortGenerationInfo[] = [
          {
            id: { cohortDefinitionId: 123, sourceId: 1 },
            status: 'COMPLETE',
            startTime: 1000000,
            personCount: 1000,
          },
          {
            id: { cohortDefinitionId: 123, sourceId: 2 },
            status: 'RUNNING',
            startTime: 2000000,
          },
        ]

        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

        await store.fetchCohortGenerationInfo(123)

        const jobs = store.getJobsByCohortId(123)
        expect(jobs).toHaveLength(2)
      })

      it('should skip info with unknown source ID', async () => {
        const store = useWebAPIStore()
        const mockInfo: CohortGenerationInfo[] = [
          {
            id: { cohortDefinitionId: 123, sourceId: 999 }, // Unknown source
            status: 'COMPLETE',
            startTime: 1000000,
          },
        ]

        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

        await store.fetchCohortGenerationInfo(123)

        const jobs = store.getJobsByCohortId(123)
        expect(jobs).toHaveLength(0)
      })

      it('should handle empty info list', async () => {
        const store = useWebAPIStore()
        vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

        await store.fetchCohortGenerationInfo(123)

        const jobs = store.getJobsByCohortId(123)
        expect(jobs).toHaveLength(0)
      })

      it('should handle fetch error', async () => {
        const store = useWebAPIStore()
        vi.mocked(webapi.getCohortGenerationInfo).mockRejectedValue(new Error('Fetch failed'))

        await store.fetchCohortGenerationInfo(123)

        const jobs = store.getJobsByCohortId(123)
        expect(jobs).toHaveLength(0)
      })
    })

    describe('Polling', () => {
      beforeEach(() => {
        vi.useFakeTimers()
      })

      afterEach(() => {
        vi.useRealTimers()
      })

      describe('pollGenerationStatus', () => {
        it('should poll and update job status', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'PENDING',
          }
          store.addGenerationJob(job)

          const mockInfo: CohortGenerationInfo[] = [
            {
              id: { cohortDefinitionId: 123, sourceId: 1 },
              status: 'RUNNING',
              startTime: 1000000,
            },
          ]

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          // Job should be updated to RUNNING
          expect(store.getJobById(1)?.status).toBe('RUNNING')

          store.stopPolling(123)
          await pollPromise
        })

        it('should stop polling when status is COMPLETE', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          const mockInfo: CohortGenerationInfo[] = [
            {
              id: { cohortDefinitionId: 123, sourceId: 1 },
              status: 'COMPLETE',
              startTime: 1000000,
              personCount: 1000,
            },
          ]

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          expect(store.getJobById(1)?.status).toBe('COMPLETE')
          expect(store.getJobById(1)?.personCount).toBe(1000)

          await pollPromise
        })

        it('should stop polling when status is FAILED', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          const mockInfo: CohortGenerationInfo[] = [
            {
              id: { cohortDefinitionId: 123, sourceId: 1 },
              status: 'FAILED',
              startTime: 1000000,
              failMessage: 'SQL error',
            },
          ]

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: mockInfo })

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          expect(store.getJobById(1)?.status).toBe('FAILED')
          expect(store.getJobById(1)?.failMessage).toBe('SQL error')

          await pollPromise
        })

        it('should stop polling when no info is returned', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          await pollPromise
        })

        it('should stop polling when no jobs exist', async () => {
          const store = useWebAPIStore()

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          await pollPromise
        })

        it('should handle polling error', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          vi.mocked(webapi.getCohortGenerationInfo).mockRejectedValue(new Error('Network error'))

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          await pollPromise
        })

        it('should clear existing timer before starting new poll', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue([
            {
              id: { cohortDefinitionId: 123, sourceId: 1 },
              status: 'RUNNING',
              startTime: 1000000,
            },
          ])

          // Start first poll
          const poll1 = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          // Start second poll (should clear first)
          const poll2 = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          store.stopPolling(123)
          await Promise.all([poll1, poll2])
        })
      })

      describe('stopPolling', () => {
        it('should stop polling for specific cohort', async () => {
          const store = useWebAPIStore()
          const job: GenerationJob = {
            id: 1,
            cohortDefinitionId: 123,
            sourceKey: 'SYNPUF1K',
            status: 'RUNNING',
          }
          store.addGenerationJob(job)

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue([
            {
              id: { cohortDefinitionId: 123, sourceId: 1 },
              status: 'RUNNING',
              startTime: 1000000,
            },
          ])

          const pollPromise = store.pollGenerationStatus(123)
          await vi.runOnlyPendingTimersAsync()

          store.stopPolling(123)

          await pollPromise
        })

        it('should handle stopping non-existent poll', () => {
          const store = useWebAPIStore()

          // Should not throw
          expect(() => store.stopPolling(999)).not.toThrow()
        })
      })

      describe('stopAllPolling', () => {
        it('should stop all active polling', async () => {
          const store = useWebAPIStore()
          store.addGenerationJob({ id: 1, cohortDefinitionId: 123, sourceKey: 'test', status: 'RUNNING' })
          store.addGenerationJob({ id: 2, cohortDefinitionId: 456, sourceKey: 'test', status: 'RUNNING' })

          vi.mocked(webapi.getCohortGenerationInfo).mockResolvedValue({ success: true, data: [] })

          const poll1 = store.pollGenerationStatus(123)
          const poll2 = store.pollGenerationStatus(456)
          await vi.runOnlyPendingTimersAsync()

          store.stopAllPolling()

          await Promise.all([poll1, poll2])
        })

        it('should handle stopping when no polls are active', () => {
          const store = useWebAPIStore()

          // Should not throw
          expect(() => store.stopAllPolling()).not.toThrow()
        })
      })
    })
  })

  describe('Constants', () => {
    it('should expose POLL_INTERVAL_MS constant', () => {
      const store = useWebAPIStore()
      expect(store.POLL_INTERVAL_MS).toBe(2000)
    })

    it('should expose POLL_TIMEOUT_MS constant', () => {
      const store = useWebAPIStore()
      expect(store.POLL_TIMEOUT_MS).toBe(300000)
    })
  })
})
