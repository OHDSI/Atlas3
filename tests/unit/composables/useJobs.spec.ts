/**
 * Unit tests for useJobs composable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

const pushMock = vi.fn()
const onMountedCallbacks: Array<() => void | Promise<void>> = []
const onUnmountedCallbacks: Array<() => void> = []

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onMounted: (cb: () => void | Promise<void>) => {
      onMountedCallbacks.push(cb)
    },
    onUnmounted: (cb: () => void) => {
      onUnmountedCallbacks.push(cb)
    },
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock('@/services/jobs.service', () => ({
  jobsService: {
    getJobs: vi.fn().mockResolvedValue({ success: true, data: [] }),
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useJobs } from '@/composables/useJobs'
import { useJobsStore } from '@/stores/jobs'
import { useAuthStore } from '@/stores/auth'
import type { Job } from '@/models/jobs.types'

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    executionId: 1,
    type: 'generateCohort',
    name: 'Test Job',
    status: 'COMPLETED',
    author: 'tester',
    startTime: null,
    endTime: null,
    duration: null,
    entityId: 42,
    sourceKey: 'CDM_KEY',
    exitMessage: null,
    ...overrides,
  }
}

describe('useJobs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    pushMock.mockClear()
    vi.clearAllMocks()
    onMountedCallbacks.length = 0
    onUnmountedCallbacks.length = 0
  })

  describe('reactive state', () => {
    it('exposes store-backed jobs and filteredJobs', () => {
      const store = useJobsStore()
      const job = makeJob({ id: 1, status: 'RUNNING' })
      store.jobs = [job]

      const { jobs, filteredJobs, hasJobs, totalJobsCount } = useJobs()

      expect(jobs.value).toEqual([job])
      expect(filteredJobs.value).toEqual([job])
      expect(hasJobs.value).toBe(true)
      expect(totalJobsCount.value).toBe(1)
    })

    it('exposes loading, error and lastFetched', () => {
      const store = useJobsStore()
      const now = new Date()
      store.isLoading = true
      store.error = 'oops'
      store.lastFetched = now

      const { isLoading, error, lastFetched } = useJobs()
      expect(isLoading.value).toBe(true)
      expect(error.value).toBe('oops')
      expect(lastFetched.value).toBe(now)
    })

    it('exposes counts derived from store', () => {
      const store = useJobsStore()
      store.jobs = [
        makeJob({ id: 1, status: 'RUNNING' }),
        makeJob({ id: 2, status: 'COMPLETED' }),
        makeJob({ id: 3, status: 'FAILED' }),
        makeJob({ id: 4, status: 'COMPLETE' }),
      ]
      const { runningJobsCount, completedJobsCount, failedJobsCount } = useJobs()
      expect(runningJobsCount.value).toBe(1)
      expect(completedJobsCount.value).toBe(2)
      expect(failedJobsCount.value).toBe(1)
    })

    it('exposes pollingEnabled and statusFilter', () => {
      const store = useJobsStore()
      store.pollingEnabled = true
      store.statusFilter = 'failed'
      const { pollingEnabled, statusFilter } = useJobs()
      expect(pollingEnabled.value).toBe(true)
      expect(statusFilter.value).toBe('failed')
    })
  })

  describe('canReadJobs', () => {
    it('returns true when permission is granted', () => {
      const auth = useAuthStore()
      auth.permissions = { job: ['job:*:get'] } as never
      const { canReadJobs } = useJobs()
      expect(canReadJobs.value).toBe(true)
    })

    it('returns false when permission is missing', () => {
      const auth = useAuthStore()
      auth.permissions = {} as never
      const { canReadJobs } = useJobs()
      expect(canReadJobs.value).toBe(false)
    })
  })

  describe('display helpers', () => {
    it('getStatusDisplay returns mapping for status', () => {
      const { getStatusDisplay } = useJobs()
      expect(getStatusDisplay('COMPLETED')).toMatchObject({ label: 'Completed' })
      expect(getStatusDisplay('FAILED')).toMatchObject({ label: 'Failed' })
    })

    it('getTypeLabel returns mapping for type', () => {
      const { getTypeLabel } = useJobs()
      expect(getTypeLabel('generateCohort')).toBe('Cohort Generation')
      expect(getTypeLabel('UNKNOWN')).toBe('Unknown')
    })

    it('getTypeIcon returns mapping for type', () => {
      const { getTypeIcon } = useJobs()
      expect(getTypeIcon('generateCohort')).toBe('mdi-account-group')
    })

    it('formatJobDuration delegates to formatDuration', () => {
      const { formatJobDuration } = useJobs()
      expect(formatJobDuration(null)).toBe('-')
      expect(formatJobDuration(1500)).toBe('1s')
    })

    it('formatDate handles null', () => {
      const { formatDate } = useJobs()
      expect(formatDate(null)).toBe('-')
    })

    it('formatDate stringifies dates', () => {
      const { formatDate } = useJobs()
      const d = new Date('2024-01-01T00:00:00Z')
      expect(typeof formatDate(d)).toBe('string')
      expect(formatDate(d).length).toBeGreaterThan(0)
    })
  })

  describe('navigation', () => {
    it('canNavigateToEntity returns true if there is a route', () => {
      const { canNavigateToEntity } = useJobs()
      expect(canNavigateToEntity(makeJob({ type: 'generateCohort', entityId: 7 }))).toBe(true)
    })

    it('canNavigateToEntity returns false if no entityId', () => {
      const { canNavigateToEntity } = useJobs()
      expect(canNavigateToEntity(makeJob({ entityId: null }))).toBe(false)
    })

    it('navigateToJobEntity pushes the route', () => {
      const { navigateToJobEntity } = useJobs()
      navigateToJobEntity(makeJob({ type: 'generateCohort', entityId: 7 }))
      expect(pushMock).toHaveBeenCalledWith('/cohorts/7')
    })

    it('navigateToJobEntity does not push if no route', () => {
      const { navigateToJobEntity } = useJobs()
      navigateToJobEntity(makeJob({ entityId: null }))
      expect(pushMock).not.toHaveBeenCalled()
    })
  })

  describe('actions', () => {
    it('refresh calls store.fetchJobs', async () => {
      const store = useJobsStore()
      const fetchSpy = vi.spyOn(store, 'fetchJobs').mockResolvedValue()
      const { refresh } = useJobs()
      await refresh()
      expect(fetchSpy).toHaveBeenCalled()
    })

    it('setFilter calls store.setStatusFilter', () => {
      const store = useJobsStore()
      const spy = vi.spyOn(store, 'setStatusFilter')
      const { setFilter } = useJobs()
      setFilter('completed')
      expect(spy).toHaveBeenCalledWith('completed')
    })

    it('togglePolling calls store.togglePolling', () => {
      const store = useJobsStore()
      const spy = vi.spyOn(store, 'togglePolling').mockImplementation(() => {})
      const { togglePolling } = useJobs()
      togglePolling()
      expect(spy).toHaveBeenCalled()
    })

    it('startPolling calls store.startPolling', () => {
      const store = useJobsStore()
      const spy = vi.spyOn(store, 'startPolling').mockImplementation(() => {})
      const { startPolling } = useJobs()
      startPolling()
      expect(spy).toHaveBeenCalled()
    })

    it('stopPolling calls store.stopPolling', () => {
      const store = useJobsStore()
      const spy = vi.spyOn(store, 'stopPolling').mockImplementation(() => {})
      const { stopPolling } = useJobs()
      stopPolling()
      expect(spy).toHaveBeenCalled()
    })
  })

  describe('initializeOnMount', () => {
    it('registers a fetch on mount and a stop-polling on unmount', async () => {
      const store = useJobsStore()
      const fetchSpy = vi.spyOn(store, 'fetchJobs').mockResolvedValue()
      const stopSpy = vi.spyOn(store, 'stopPolling').mockImplementation(() => {})

      const { initializeOnMount } = useJobs()
      initializeOnMount()

      // Lifecycle hooks captured by the mock
      expect(onMountedCallbacks).toHaveLength(1)
      expect(onUnmountedCallbacks).toHaveLength(1)

      // Simulate mount: invoke the captured onMounted callback
      await onMountedCallbacks[0]?.()
      expect(fetchSpy).toHaveBeenCalled()

      // Simulate unmount: invoke the captured onUnmounted callback
      onUnmountedCallbacks[0]?.()
      expect(stopSpy).toHaveBeenCalled()
    })
  })
})
