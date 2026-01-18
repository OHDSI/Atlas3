/**
 * Jobs Store
 *
 * Pinia store for managing job execution state.
 * Handles fetching, polling, and filtering of job data.
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jobsService } from '@/services/jobs.service'
import { logger } from '@/utils/logger'
import type { Job, JobStatusFilter } from '@/models/jobs.types'
import { isJobRunning, isJobCompleted, isJobFailed } from '@/models/jobs.types'

/** Polling interval in milliseconds (2 seconds) */
const POLLING_INTERVAL_MS = 2000

export const useJobsStore = defineStore('jobs', () => {
  // State
  const jobs = ref<Job[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const pollingEnabled = ref(false)
  const statusFilter = ref<JobStatusFilter>('all')
  const lastFetched = ref<Date | null>(null)

  // Private polling interval ID
  let pollingIntervalId: ReturnType<typeof setInterval> | null = null

  // Getters
  const filteredJobs = computed(() => {
    if (statusFilter.value === 'all') {
      return jobs.value
    }

    return jobs.value.filter(job => {
      switch (statusFilter.value) {
        case 'running':
          return isJobRunning(job.status)
        case 'completed':
          return isJobCompleted(job.status)
        case 'failed':
          return isJobFailed(job.status)
        default:
          return true
      }
    })
  })

  const runningJobsCount = computed(() =>
    jobs.value.filter(job => isJobRunning(job.status)).length
  )

  const completedJobsCount = computed(() =>
    jobs.value.filter(job => isJobCompleted(job.status)).length
  )

  const failedJobsCount = computed(() =>
    jobs.value.filter(job => isJobFailed(job.status)).length
  )

  const hasJobs = computed(() => jobs.value.length > 0)

  // Actions
  async function fetchJobs(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const result = await jobsService.getJobs()

      if (result.success) {
        jobs.value = result.data
        lastFetched.value = new Date()
      } else {
        error.value = result.error
        logger.error('JobsStore', 'Failed to fetch jobs', result.error)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch jobs'
      error.value = message
      logger.error('JobsStore', 'Failed to fetch jobs', err)
    } finally {
      isLoading.value = false
    }
  }

  function startPolling(): void {
    if (pollingIntervalId) {
      return // Already polling
    }

    pollingEnabled.value = true
    pollingIntervalId = setInterval(() => {
      fetchJobs()
    }, POLLING_INTERVAL_MS)

    logger.debug('JobsStore', 'Started job polling')
  }

  function stopPolling(): void {
    if (pollingIntervalId) {
      clearInterval(pollingIntervalId)
      pollingIntervalId = null
    }
    pollingEnabled.value = false

    logger.debug('JobsStore', 'Stopped job polling')
  }

  function togglePolling(): void {
    if (pollingEnabled.value) {
      stopPolling()
    } else {
      startPolling()
    }
  }

  function setStatusFilter(filter: JobStatusFilter): void {
    statusFilter.value = filter
  }

  function getJobById(id: number): Job | undefined {
    return jobs.value.find(job => job.id === id)
  }

  function clearJobs(): void {
    jobs.value = []
    error.value = null
    lastFetched.value = null
  }

  /**
   * Cleanup - should be called when component unmounts
   */
  function dispose(): void {
    stopPolling()
    clearJobs()
  }

  return {
    // State
    jobs,
    isLoading,
    error,
    pollingEnabled,
    statusFilter,
    lastFetched,

    // Getters
    filteredJobs,
    runningJobsCount,
    completedJobsCount,
    failedJobsCount,
    hasJobs,

    // Actions
    fetchJobs,
    startPolling,
    stopPolling,
    togglePolling,
    setStatusFilter,
    getJobById,
    clearJobs,
    dispose
  }
})
