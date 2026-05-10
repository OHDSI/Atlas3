/**
 * Jobs Composable
 *
 * Provides reactive access to job data and utilities for job-related operations.
 */

import { computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useJobsStore } from '@/stores/jobs'
import { useAuthStore } from '@/stores/auth'
import { permissionChecker } from '@/services/auth/permissionChecker'
import {
  type Job,
  type JobStatusFilter,
  JOB_STATUS_DISPLAY,
  JOB_TYPE_LABELS,
  JOB_TYPE_ICONS,
  getJobEntityRoute,
  formatDuration,
} from '@/models/jobs.types'

/**
 * Permission string for reading job executions. The store hits
 * `GET /job/execution?comprehensivePage=true`, which Apache Shiro maps to
 * `job:execution:get`. The earlier `job:*:get` wildcard form was never
 * registered server-side, so it always resolved to false.
 */
const JOBS_READ_PERMISSION = 'job:execution:get'

export function useJobs() {
  const jobsStore = useJobsStore()
  const authStore = useAuthStore()
  const router = useRouter()

  /**
   * Check if user has permission to read jobs
   */
  const canReadJobs = computed(() => {
    return permissionChecker.hasPermission(JOBS_READ_PERMISSION, authStore.permissions).granted
  })

  // Computed properties from store
  const jobs = computed(() => jobsStore.jobs)
  const filteredJobs = computed(() => jobsStore.filteredJobs)
  const isLoading = computed(() => jobsStore.isLoading)
  const error = computed(() => jobsStore.error)
  const pollingEnabled = computed(() => jobsStore.pollingEnabled)
  const statusFilter = computed(() => jobsStore.statusFilter)
  const lastFetched = computed(() => jobsStore.lastFetched)

  // Job counts
  const runningJobsCount = computed(() => jobsStore.runningJobsCount)
  const completedJobsCount = computed(() => jobsStore.completedJobsCount)
  const failedJobsCount = computed(() => jobsStore.failedJobsCount)
  const totalJobsCount = computed(() => jobsStore.jobs.length)
  const hasJobs = computed(() => jobsStore.hasJobs)

  /**
   * Get display properties for a job status
   */
  function getStatusDisplay(status: Job['status']) {
    return JOB_STATUS_DISPLAY[status]
  }

  /**
   * Get label for a job type
   */
  function getTypeLabel(type: Job['type']) {
    return JOB_TYPE_LABELS[type]
  }

  /**
   * Get icon for a job type
   */
  function getTypeIcon(type: Job['type']) {
    return JOB_TYPE_ICONS[type]
  }

  /**
   * Format a duration value
   */
  function formatJobDuration(durationMs: number | null) {
    return formatDuration(durationMs)
  }

  /**
   * Format a date for display
   */
  function formatDate(date: Date | null): string {
    if (!date) return '-'
    return date.toLocaleString()
  }

  /**
   * Navigate to a job's source entity
   */
  function navigateToJobEntity(job: Job): void {
    const route = getJobEntityRoute(job)
    if (route) {
      router.push(route)
    }
  }

  /**
   * Check if a job has a navigable entity
   */
  function canNavigateToEntity(job: Job): boolean {
    return getJobEntityRoute(job) !== null
  }

  /**
   * Refresh jobs data
   */
  async function refresh(): Promise<void> {
    await jobsStore.fetchJobs()
  }

  /**
   * Set the status filter
   */
  function setFilter(filter: JobStatusFilter): void {
    jobsStore.setStatusFilter(filter)
  }

  /**
   * Toggle auto-polling
   */
  function togglePolling(): void {
    jobsStore.togglePolling()
  }

  /**
   * Start polling for job updates
   */
  function startPolling(): void {
    jobsStore.startPolling()
  }

  /**
   * Stop polling for job updates
   */
  function stopPolling(): void {
    jobsStore.stopPolling()
  }

  /**
   * Initialize jobs - fetch data on mount
   */
  function initializeOnMount(): void {
    onMounted(async () => {
      await jobsStore.fetchJobs()
    })

    onUnmounted(() => {
      jobsStore.stopPolling()
    })
  }

  return {
    // Permissions
    canReadJobs,

    // State
    jobs,
    filteredJobs,
    isLoading,
    error,
    pollingEnabled,
    statusFilter,
    lastFetched,

    // Counts
    runningJobsCount,
    completedJobsCount,
    failedJobsCount,
    totalJobsCount,
    hasJobs,

    // Display helpers
    getStatusDisplay,
    getTypeLabel,
    getTypeIcon,
    formatJobDuration,
    formatDate,

    // Navigation
    navigateToJobEntity,
    canNavigateToEntity,

    // Actions
    refresh,
    setFilter,
    togglePolling,
    startPolling,
    stopPolling,
    initializeOnMount,
  }
}
