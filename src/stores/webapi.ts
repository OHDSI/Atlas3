/**
 * WebAPI Store
 * Manages CDM sources and generation jobs
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CDMSource, GenerationJob } from '@/models/webapi.types'
import * as webapi from '@/services/webapi'
import { logger } from '@/utils/logger'

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

  const vocabularySources = computed(() => {
    return sources.value.filter(s => s.daimons?.some(d => d.daimonType === 'Vocabulary'))
  })

  /** Returns validated vocabulary source key, auto-correcting invalid localStorage values */
  function getValidVocabularySource(): string | null {
    const storedVocab = localStorage.getItem('selectedVocabulary')

    if (storedVocab && storedVocab.trim() !== '' && storedVocab !== 'null' && storedVocab !== 'undefined') {
      if (vocabularySources.value.some(s => s.sourceKey === storedVocab)) {
        return storedVocab
      }
      logger.warn('WebAPIStore', 'Stored vocabulary source not found', { stored: storedVocab })
    }

    const firstVocabSource = vocabularySources.value[0]
    if (firstVocabSource) {
      localStorage.setItem('selectedVocabulary', firstVocabSource.sourceKey)
      return firstVocabSource.sourceKey
    }

    return null
  }

  // Actions
  function setSources(sourcesList: CDMSource[]) {
    sources.value = sourcesList
    // Auto-select first source if none selected
    if (!selectedSource.value && sourcesList.length > 0) {
      selectedSource.value = sourcesList[0]?.sourceKey ?? null
      logger.debug('WebAPIStore', 'Auto-selected first source', { selected: selectedSource.value, sources: sourcesList.map(s => s.sourceKey) })
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
      const result = await webapi.fetchCDMSources()
      if (result.success) {
        setSources(result.data)
      } else {
        logger.error('WebAPIStore', 'Failed to fetch CDM sources', result.error)
        setSources([])
      }
    } catch (error) {
      logger.error('WebAPIStore', 'Unexpected error fetching CDM sources', error)
      setSources([])
    } finally {
      setLoadingSources(false)
    }
  }

  /**
   * Generate cohort for a specific data source.
   *
   * Jobs are keyed by sourceId so they line up with the /info endpoint, which
   * returns entries keyed by `id.sourceId`. When sources aren't loaded we
   * fall back to an existing job slot or the API-supplied id so polling can
   * still match the entry by `info.id.sourceId === job.id`.
   */
  async function generateCohort(cohortId: number, sourceKey: string): Promise<GenerationJob | null> {
    const source = sources.value.find(s => s.sourceKey === sourceKey)
    const existingJob = getJobsByCohortId(cohortId).find(j => j.sourceKey === sourceKey)
    const knownKey = source?.sourceId ?? existingJob?.id

    if (knownKey != null) {
      // Optimistically show PENDING while the start request is in flight.
      updateGenerationJob(knownKey, {
        id: knownKey,
        cohortDefinitionId: cohortId,
        sourceKey,
        status: 'PENDING',
        startTime: existingJob?.startTime ?? new Date().toISOString(),
      })
    }

    try {
      const job = await webapi.generateCohort(cohortId, sourceKey)

      if (job) {
        const finalKey = knownKey ?? job.id
        if (knownKey != null && knownKey !== finalKey) {
          removeGenerationJob(knownKey)
        }
        updateGenerationJob(finalKey, {
          ...job,
          id: finalKey,
          cohortDefinitionId: cohortId,
          sourceKey,
        })
        pollGenerationStatus(cohortId)
        return job
      }

      // API call succeeded but returned null — surface as failure so the UI
      // doesn't sit on PENDING forever.
      if (knownKey != null) {
        updateGenerationJob(knownKey, {
          id: knownKey,
          cohortDefinitionId: cohortId,
          sourceKey,
          status: 'FAILED',
          failMessage: 'Generation request failed',
        })
      }
      return null
    } catch (error) {
      if (knownKey != null) {
        updateGenerationJob(knownKey, {
          id: knownKey,
          cohortDefinitionId: cohortId,
          sourceKey,
          status: 'FAILED',
          failMessage: error instanceof Error ? error.message : 'Generation failed',
        })
      }
      logger.error('WebAPIStore', 'Failed to generate cohort', error)
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
        const result = await webapi.getCohortGenerationInfo(cohortId)

        // An empty/failed response doesn't mean we're done — a freshly kicked
        // off generation may not be indexed yet. Keep polling and rely on the
        // per-cohort terminal-state check below to stop.
        if (result.success) {
          for (const info of result.data) {
            // Jobs are keyed by sourceId (matches /info entries directly).
            const existing = generationJobs.value.get(info.id.sourceId)
            // Only update jobs we actually started for this cohort. /info may
            // return entries we don't have a job for — leave those alone.
            if (!existing || existing.cohortDefinitionId !== cohortId) continue

            const source = sources.value.find(s => s.sourceId === info.id.sourceId)
            const sourceKey = source?.sourceKey ?? existing.sourceKey

            updateGenerationJob(info.id.sourceId, {
              id: info.id.sourceId,
              cohortDefinitionId: cohortId,
              sourceKey,
              status: info.status,
              personCount: info.personCount ?? undefined,
              recordCount: info.recordCount ?? undefined,
              startTime: info.startTime ? new Date(info.startTime).toISOString() : existing.startTime,
              endTime: info.status === 'COMPLETE' || info.status === 'FAILED'
                ? (info.startTime != null && info.executionDuration != null
                    ? new Date(info.startTime + info.executionDuration).toISOString()
                    : new Date().toISOString())
                : undefined,
              failMessage: info.failMessage ?? undefined,
            })
          }
        }

        const stillActive = getJobsByCohortId(cohortId).some(
          j => j.status === 'PENDING' || j.status === 'RUNNING'
        )

        if (!stillActive) {
          stopPolling(cohortId)
          return
        }

        if (Date.now() - startTime > POLL_TIMEOUT_MS) {
          logger.warn('WebAPIStore', `Generation polling timeout for cohort ${cohortId}`)
          stopPolling(cohortId)
        }
      } catch (error) {
        logger.error('WebAPIStore', 'Error polling generation status', error)
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
      const result = await webapi.getCohortGenerationInfo(cohortId)

      if (!result.success || result.data.length === 0) {
        return
      }

      const infoList = result.data

      // Convert each generation info to a GenerationJob
      // We need to map sourceId to sourceKey
      for (const info of infoList) {
        // Find the source that matches this sourceId
        const source = sources.value.find(s => s.sourceId === info.id.sourceId)
        if (!source) {
          logger.warn('WebAPIStore', `Could not find source with ID ${info.id.sourceId}`)
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
      logger.error('WebAPIStore', 'Failed to fetch cohort generation info', error)
    }
  }

  // Cleanup function
  function dispose() {
    stopAllPolling()
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
    vocabularySources,
    getJobById,
    getJobsByCohortId,
    getValidVocabularySource,
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
    // Cleanup
    dispose,
    // Constants (for testing)
    POLL_INTERVAL_MS,
    POLL_TIMEOUT_MS,
  }
})
