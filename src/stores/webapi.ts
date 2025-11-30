/**
 * WebAPI Store
 * Manages CDM sources and generation jobs
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CDMSource, GenerationJob } from '@/models/webapi.types'
import * as webapi from '@/services/webapi'

export const useWebAPIStore = defineStore('webapi', () => {
  // State
  const sources = ref<CDMSource[]>([])
  const selectedSource = ref<string | null>(null)
  const generationJobs = ref<Map<number, GenerationJob>>(new Map())
  const isLoadingSources = ref(false)

  // Getters
  const sourcesList = computed(() => sources.value)

  const currentSource = computed(() => {
    if (!selectedSource.value) return null
    return sources.value.find(s => s.sourceKey === selectedSource.value) ?? null
  })

  const activeJobs = computed(() => {
    return Array.from(generationJobs.value.values()).filter(
      job => job.status === 'PENDING' || job.status === 'RUNNING'
    )
  })

  function getJobById(id: number): GenerationJob | undefined {
    return generationJobs.value.get(id)
  }

  function getJobsByCohortId(cohortId: number): GenerationJob[] {
    return Array.from(generationJobs.value.values()).filter(
      job => job.cohortDefinitionId === cohortId
    )
  }

  // Actions
  function setSources(sourcesList: CDMSource[]) {
    sources.value = sourcesList
    // Auto-select first source if none selected
    if (!selectedSource.value && sourcesList.length > 0) {
      selectedSource.value = sourcesList[0]?.sourceKey ?? null
      console.log('[WebAPI Store] Auto-selected first source:', selectedSource.value, '| All sources:', sourcesList.map(s => s.sourceKey))
    }
  }

  function setSelectedSource(sourceKey: string) {
    selectedSource.value = sourceKey
  }

  function setLoadingSources(loading: boolean) {
    isLoadingSources.value = loading
  }

  function addGenerationJob(job: GenerationJob) {
    generationJobs.value.set(job.id, job)
  }

  function updateGenerationJob(id: number, job: GenerationJob) {
    generationJobs.value.set(id, job)
  }

  function removeGenerationJob(id: number) {
    generationJobs.value.delete(id)
  }

  function clearJobs() {
    generationJobs.value.clear()
  }

  // Generation workflow actions

  /**
   * Fetch available CDM data sources
   */
  async function fetchSources(): Promise<void> {
    try {
      setLoadingSources(true)
      const fetchedSources = await webapi.fetchCDMSources()
      setSources(fetchedSources)
    } catch (error) {
      console.error('Failed to fetch CDM sources:', error)
      setSources([])
    } finally {
      setLoadingSources(false)
    }
  }

  /**
   * Generate cohort for a specific data source
   */
  async function generateCohort(cohortId: number, sourceKey: string): Promise<GenerationJob | null> {
    try {
      // Check if there's an existing job for this cohort/source combination
      const existingJobs = getJobsByCohortId(cohortId)
      const existingJob = existingJobs.find(j => j.sourceKey === sourceKey)

      // Immediately update UI to show "Starting generation..." status
      if (existingJob) {
        // Update existing job to show it's starting
        updateGenerationJob(existingJob.id, {
          ...existingJob,
          status: 'PENDING',
        })
      }

      const job = await webapi.generateCohort(cohortId, sourceKey)

      if (job) {
        // Update or add the job
        if (existingJob) {
          updateGenerationJob(existingJob.id, {
            ...job,
            id: existingJob.id, // Keep the same ID for updates
          })
        } else {
          addGenerationJob(job)
        }

        // Start polling for status updates
        pollGenerationStatus(cohortId)
      }

      return job
    } catch (error) {
      console.error('Failed to generate cohort:', error)
      return null
    }
  }

  /**
   * Poll generation status every 2 seconds until complete or failed
   */
  const POLL_INTERVAL_MS = 2000 // 2 seconds
  const POLL_TIMEOUT_MS = 300000 // 5 minutes max
  const pollingTimers = new Map<number, number>()

  async function pollGenerationStatus(cohortId: number): Promise<void> {
    // Clear any existing timer for this cohort
    const existingTimer = pollingTimers.get(cohortId)
    if (existingTimer) {
      clearInterval(existingTimer)
    }

    const startTime = Date.now()

    const poll = async () => {
      try {
        const infoList = await webapi.getCohortGenerationInfo(cohortId)

        if (!infoList || infoList.length === 0) {
          // If we can't get info, stop polling
          stopPolling(cohortId)
          return
        }

        // Find the latest job for this cohort
        const jobs = getJobsByCohortId(cohortId)
        if (jobs.length > 0) {
          const latestJob = jobs[jobs.length - 1]
          if (!latestJob) {
            stopPolling(cohortId)
            return
          }

          // Find matching generation info for this job's source
          // We need to match by sourceKey, but the info has sourceId
          // For now, just use the first info entry (we'll need to improve this later)
          const info = infoList[0]
          if (info && info.status) {
            const updatedJob: GenerationJob = {
              id: latestJob.id,
              cohortDefinitionId: cohortId,
              sourceKey: latestJob.sourceKey, // Keep the original sourceKey
              status: info.status,
              personCount: info.personCount ?? undefined,
              recordCount: info.recordCount ?? undefined,
              startTime: info.startTime ? new Date(info.startTime).toISOString() : latestJob.startTime,
              endTime: info.status === 'COMPLETE' || info.status === 'FAILED' ? new Date().toISOString() : undefined,
              failMessage: info.failMessage ?? undefined,
            }

            updateGenerationJob(latestJob.id, updatedJob)

            // Stop polling if complete or failed
            if (info.status === 'COMPLETE' || info.status === 'FAILED') {
              stopPolling(cohortId)
              return
            }
          }
        }

        // Check for timeout
        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          console.warn(`Generation polling timeout for cohort ${cohortId}`)
          stopPolling(cohortId)
        }
      } catch (error) {
        console.error('Error polling generation status:', error)
        stopPolling(cohortId)
      }
    }

    // Start polling
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    pollingTimers.set(cohortId, timer as unknown as number)

    // Do an immediate poll
    await poll()
  }

  /**
   * Stop polling for a specific cohort
   */
  function stopPolling(cohortId: number): void {
    const timer = pollingTimers.get(cohortId)
    if (timer) {
      clearInterval(timer)
      pollingTimers.delete(cohortId)
    }
  }

  /**
   * Stop all active polling
   */
  function stopAllPolling(): void {
    pollingTimers.forEach((timer) => clearInterval(timer))
    pollingTimers.clear()
  }

  /**
   * Fetch existing generation info for a cohort and convert to GenerationJob format
   * This loads previously generated cohort data from the backend
   */
  async function fetchCohortGenerationInfo(cohortId: number): Promise<void> {
    try {
      const infoList = await webapi.getCohortGenerationInfo(cohortId)

      if (!infoList || infoList.length === 0) {
        return
      }

      // Convert each generation info to a GenerationJob
      // We need to map sourceId to sourceKey
      for (const info of infoList) {
        // Find the source that matches this sourceId
        const source = sources.value.find(s => s.sourceId === info.id.sourceId)
        if (!source) {
          console.warn(`Could not find source with ID ${info.id.sourceId}`)
          continue
        }

        // Create a GenerationJob from the info
        const job: GenerationJob = {
          id: info.id.sourceId, // Use sourceId as job ID (since we don't have a separate job ID)
          cohortDefinitionId: info.id.cohortDefinitionId,
          sourceKey: source.sourceKey,
          status: info.status,
          startTime: info.startTime ? new Date(info.startTime).toISOString() : undefined,
          endTime: info.executionDuration && info.startTime
            ? new Date(info.startTime + info.executionDuration).toISOString()
            : undefined,
          personCount: info.personCount ?? undefined,
          recordCount: info.recordCount ?? undefined,
          failMessage: info.failMessage ?? undefined,
        }

        addGenerationJob(job)
      }
    } catch (error) {
      console.error('Failed to fetch cohort generation info:', error)
    }
  }

  return {
    // State
    sources,
    selectedSource,
    generationJobs,
    isLoadingSources,
    // Getters
    sourcesList,
    currentSource,
    activeJobs,
    getJobById,
    getJobsByCohortId,
    // Actions
    setSources,
    setSelectedSource,
    setLoadingSources,
    addGenerationJob,
    updateGenerationJob,
    removeGenerationJob,
    clearJobs,
    // Generation workflow
    fetchSources,
    fetchCohortGenerationInfo,
    generateCohort,
    pollGenerationStatus,
    stopPolling,
    stopAllPolling,
    // Constants (for testing)
    POLL_INTERVAL_MS,
    POLL_TIMEOUT_MS,
  }
})
