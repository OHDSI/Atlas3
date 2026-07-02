/**
 * Unit Tests: Jobs Service
 *
 * Tests for job execution API calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getJobs, jobsService, mapHadesJob } from '@/services/jobs.service'

// Mock http-client
vi.mock('@/services/http-client', () => ({
  httpGet: vi.fn()
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

describe('JobsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getJobs', () => {
    it('returns jobs from array response format', async () => {
      const { httpGet } = await import('@/services/http-client')
      const now = Date.now()
      const mockExecutions = [
        {
          executionId: 1,
          status: 'COMPLETED',
          startDate: now - 60000, // Older - will be sorted second
          endDate: now,
          // parseJobType looks for keywords in the name (case-insensitive)
          jobInstance: { name: 'Cohort Generation Job' },
          jobParameters: {
            cohort_definition_id: 123,
            jobName: 'Test Cohort Generation',
            jobAuthor: 'testuser'
          }
        },
        {
          executionId: 2,
          status: 'RUNNING',
          startDate: now - 30000, // Newer - will be sorted first
          jobInstance: { name: 'Incidence Rate Analysis' },
          jobParameters: {
            analysis_id: 456,
            jobName: 'IR Analysis Job'
          }
        }
      ]

      vi.mocked(httpGet).mockResolvedValue(mockExecutions)

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      // Jobs are sorted by startTime descending, so most recent (executionId 2) comes first
      expect(result.data![0].type).toBe('irAnalysis')
      expect(result.data![0].entityId).toBe(456)
      expect(result.data![1].type).toBe('generateCohort')
      expect(result.data![1].entityId).toBe(123)
    })

    it('returns jobs from paginated response format', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockPaginatedResponse = {
        content: [
          {
            executionId: 1,
            status: 'COMPLETED',
            startDate: Date.now() - 60000,
            endDate: Date.now(),
            jobInstance: { name: 'generateCohort' },
            jobParameters: { cohort_definition_id: 100 }
          }
        ],
        totalPages: 1,
        totalElements: 1
      }

      vi.mocked(httpGet).mockResolvedValue(mockPaginatedResponse)

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].entityId).toBe(100)
    })

    it('sorts jobs by start time descending', async () => {
      const { httpGet } = await import('@/services/http-client')
      const now = Date.now()
      const mockExecutions = [
        {
          executionId: 1,
          status: 'COMPLETED',
          startDate: now - 120000, // Older
          jobInstance: { name: 'generateCohort' }
        },
        {
          executionId: 2,
          status: 'COMPLETED',
          startDate: now - 60000, // Newer
          jobInstance: { name: 'generateCohort' }
        },
        {
          executionId: 3,
          status: 'COMPLETED',
          startDate: now - 180000, // Oldest
          jobInstance: { name: 'generateCohort' }
        }
      ]

      vi.mocked(httpGet).mockResolvedValue(mockExecutions)

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data![0].executionId).toBe(2) // Most recent first
      expect(result.data![1].executionId).toBe(1)
      expect(result.data![2].executionId).toBe(3)
    })

    it('handles jobs without start times in sorting', async () => {
      const { httpGet } = await import('@/services/http-client')
      const mockExecutions = [
        {
          executionId: 1,
          status: 'PENDING',
          startDate: null,
          jobInstance: { name: 'generateCohort' }
        },
        {
          executionId: 2,
          status: 'COMPLETED',
          startDate: Date.now(),
          jobInstance: { name: 'generateCohort' }
        }
      ]

      vi.mocked(httpGet).mockResolvedValue(mockExecutions)

      const result = await getJobs()

      expect(result.success).toBe(true)
      // Job with startTime should come first
      expect(result.data![0].executionId).toBe(2)
      expect(result.data![1].executionId).toBe(1)
    })

    it('returns failure on validation error', async () => {
      const { httpGet } = await import('@/services/http-client')
      // Invalid data structure that will fail Zod validation
      vi.mocked(httpGet).mockResolvedValue('invalid data')

      const result = await getJobs()

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid job executions response format')
    })

    it('returns failure on network error', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockRejectedValue(new Error('Network error'))

      const result = await getJobs()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network error')
    })

    it('handles empty response', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue([])

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })

    it('handles empty paginated response', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValue({ content: [] })

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })

  describe('cache jobs merge', () => {
    it('merges bao cache jobs into the results when the cache endpoint returns { jobs: [...] }', async () => {
      const { httpGet } = await import('@/services/http-client')
      // First call: /job/execution returns an empty list.
      // Second call: /trexsql/cache/jobs returns a cache job that should be
      // transformed into a synthetic Job entry.
      vi.mocked(httpGet)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({
          jobs: [
            {
              databaseCode: 'SYNPUF1K',
              sourceKey: 'SYNPUF1K',
              status: 'COMPLETE',
              startTime: '2024-01-01T00:00:00Z',
              endTime: '2024-01-01T01:00:00Z',
              totalTables: 10,
              completedTables: 10,
            },
          ],
        })

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].type).toBe('cacheGeneration')
      expect(result.data![0].status).toBe('COMPLETED')
      expect(result.data![0].name).toContain('SYNPUF1K')
    })

    it('skips cache jobs that are missing databaseCode / sourceKey', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({
          jobs: [
            // No databaseCode / sourceKey → transformCacheJob returns null.
            { status: 'RUNNING' },
            // Valid one.
            { databaseCode: 'DB1', status: 'RUNNING' },
          ],
        })

      const result = await getJobs()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].name).toContain('DB1')
    })

    it('parses numeric (microsecond / millisecond / second) timestamps on cache jobs', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({
          jobs: [
            {
              databaseCode: 'DB-US', // microseconds
              status: 'RUNNING',
              startTime: '1700000000000000',
            },
            {
              databaseCode: 'DB-MS', // milliseconds
              status: 'RUNNING',
              startTime: '1700000000000',
            },
            {
              databaseCode: 'DB-S', // seconds
              status: 'RUNNING',
              startTime: '1700000000',
            },
            {
              databaseCode: 'DB-EMPTY', // empty timestamp
              status: 'RUNNING',
              startTime: '   ',
            },
          ],
        })

      const result = await getJobs()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(4)
    })

    it('treats a failing cache-jobs fetch as non-fatal and still returns batch jobs', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet)
        .mockResolvedValueOnce([
          {
            executionId: 1,
            status: 'COMPLETED',
            startDate: Date.now(),
            jobInstance: { name: 'generateCohort' },
          },
        ])
        .mockRejectedValueOnce(new Error('bao down'))

      const result = await getJobs()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })
  })

  describe('jobsService singleton', () => {
    it('exports getJobs function', () => {
      expect(jobsService.getJobs).toBe(getJobs)
    })
  })

  describe('mapHadesJob', () => {
    it('maps a running HADES job to the unified Job shape', () => {
      const job = mapHadesJob({
        jobId: 'job-123',
        status: 'RUNNING',
        pid: 4242,
        currentModule: 'CohortDiagnostics',
        modulesCompleted: [],
        elapsedMs: 5000,
        errorMessage: null,
        envName: 'renv-1',
        databaseName: 'SYNPUF1K',
      })

      expect(job.type).toBe('strategusExecution')
      expect(typeof job.id).toBe('number')
      expect(job.id).toBe(job.executionId)
      expect(job.status).toBe('RUNNING')
      expect(job.name).toBe('Strategus — CohortDiagnostics')
      expect(job.duration).toBe(5000)
      expect(job.sourceKey).toBe('SYNPUF1K')
      expect(job.startTime).toBeNull()
      expect(job.endTime).toBeNull()
      expect(job.entityId).toBeNull()
      expect(job.author).toBe('')
      expect(job.exitMessage).toBeNull()
    })

    it('maps CANCELLED status to STOPPED', () => {
      const job = mapHadesJob({
        jobId: 'job-456',
        status: 'CANCELLED',
        pid: null,
        currentModule: null,
        modulesCompleted: [],
        elapsedMs: 1200,
        errorMessage: null,
        envName: 'renv-2',
        databaseName: 'CDM_A',
      })

      expect(job.status).toBe('STOPPED')
      // Falls back to envName when currentModule is null.
      expect(job.name).toBe('Strategus — renv-2')
    })

    it('maps COMPLETED and FAILED statuses through, and passes errorMessage as exitMessage', () => {
      const completed = mapHadesJob({
        jobId: 'job-a',
        status: 'COMPLETED',
        pid: null,
        currentModule: 'X',
        modulesCompleted: ['X'],
        elapsedMs: 100,
        errorMessage: null,
        envName: 'e',
        databaseName: 'd',
      })
      expect(completed.status).toBe('COMPLETED')

      const failed = mapHadesJob({
        jobId: 'job-b',
        status: 'FAILED',
        pid: null,
        currentModule: 'Y',
        modulesCompleted: [],
        elapsedMs: 100,
        errorMessage: 'boom',
        envName: 'e',
        databaseName: 'd',
      })
      expect(failed.status).toBe('FAILED')
      expect(failed.exitMessage).toBe('boom')
    })

    it('produces a stable synthetic numeric id derived from jobId', () => {
      const jobA = mapHadesJob({
        jobId: 'same-id',
        status: 'RUNNING',
        pid: null,
        currentModule: null,
        modulesCompleted: [],
        elapsedMs: 0,
        errorMessage: null,
        envName: 'e',
        databaseName: 'd',
      })
      const jobB = mapHadesJob({
        jobId: 'same-id',
        status: 'COMPLETED',
        pid: null,
        currentModule: null,
        modulesCompleted: [],
        elapsedMs: 0,
        errorMessage: null,
        envName: 'e',
        databaseName: 'd',
      })
      expect(jobA.id).toBe(jobB.id)
    })
  })

  describe('hades jobs merge', () => {
    it('merges HADES/Strategus jobs into getJobs results', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet)
        .mockResolvedValueOnce([]) // /job/execution
        .mockResolvedValueOnce({ jobs: [] }) // /trexsql/cache/jobs

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          jobs: [
            {
              jobId: 'hades-1',
              status: 'RUNNING',
              pid: 1,
              currentModule: 'CohortDiagnostics',
              modulesCompleted: [],
              elapsedMs: 2500,
              errorMessage: null,
              envName: 'renv-1',
              databaseName: 'SYNPUF1K',
            },
          ],
        }),
      } as Response)

      const result = await getJobs()

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
      expect(result.data![0].type).toBe('strategusExecution')
      expect(result.data![0].name).toBe('Strategus — CohortDiagnostics')
    })

    it('treats a failing hades-api fetch as non-fatal and still returns other jobs', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet)
        .mockResolvedValueOnce([
          {
            executionId: 1,
            status: 'COMPLETED',
            startDate: Date.now(),
            jobInstance: { name: 'generateCohort' },
          },
        ])
        .mockResolvedValueOnce({ jobs: [] })

      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('hades-api down'))

      const result = await getJobs()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(1)
    })

    it('treats a non-array jobs field from hades-api as empty', async () => {
      const { httpGet } = await import('@/services/http-client')
      vi.mocked(httpGet).mockResolvedValueOnce([]).mockResolvedValueOnce({ jobs: [] })

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ jobs: 'not-an-array' }),
      } as Response)

      const result = await getJobs()
      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(0)
    })
  })
})
