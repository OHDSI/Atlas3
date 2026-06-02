/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, computed, watch, type WatchStopHandle } from 'vue'
import type {
  CohortDefinition,
  CohortEvent,
  ConceptSetReference,
  ExitCriteria,
  InclusionRule,
  ObservationPeriod,
} from '@/models/cohort.types'
import type { AgentProposal } from '@/models/agent.types'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { saveCohortToCache, getCohortFromCache, deleteCohortFromCache } from '@/utils/cohort-cache'
import { getVersion as getVersionAPI } from '@/services/cohort-definition-versions.service'
import { logger } from '@/utils/logger'

const STORAGE_KEY = 'atlas3_cohort_draft'
const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

// Exponential backoff retry configuration
const RETRY_CONFIG = {
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  maxAttempts: 5,
  backoffMultiplier: 2,
}

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
}

interface RetryState {
  attempt: number
  nextRetryAt: Date | null
  isRetrying: boolean
}

export const useCohortStore = defineStore('cohort', () => {
  // State
  const currentCohort = ref<CohortDefinition | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)
  // Bumped every time `applyProposal` mutates the cohort. Components that hold
  // their own local copies of `currentCohort.*` (e.g. CohortBuilder) watch this
  // counter and re-sync; they don't watch `currentCohort` itself, which would
  // create a feedback loop with their own user-edit writes.
  const agentRevision = ref(0)

  // Version preview state (T013)
  const previewVersion = ref<Version | null>(null)

  // Validation state
  const validationErrors = ref<ValidationError[]>([])
  const isReadOnly = ref(false)

  // Network retry state
  const retryState = ref<RetryState>({
    attempt: 0,
    nextRetryAt: null,
    isRetrying: false,
  })

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let watchHandle: WatchStopHandle | null = null

  // Getters
  const hasEntryEvents = computed(() => {
    return (currentCohort.value?.entryEvents.length ?? 0) > 0
  })

  const hasInclusionRules = computed(() => {
    return (currentCohort.value?.inclusionRules.length ?? 0) > 0
  })

  const entryEventCount = computed(() => {
    return currentCohort.value?.entryEvents.length ?? 0
  })

  const hasValidationErrors = computed(() => {
    return validationErrors.value.some(err => err.severity === 'error')
  })

  const canSave = computed(() => {
    return !isReadOnly.value && !hasValidationErrors.value
  })

  // Actions
  function setCohort(cohort: CohortDefinition) {
    currentCohort.value = cohort
    isDirty.value = false
    validateCohort()
  }

  function createNewCohort() {
    currentCohort.value = {
      name: 'New Cohort',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
    }
    isDirty.value = false
    clearDraft()
  }

  function addEntryEvent(event: CohortEvent) {
    if (!currentCohort.value) {
      createNewCohort()
    }
    currentCohort.value?.entryEvents.push(event)
    isDirty.value = true
  }

  function removeEntryEvent(eventId: string) {
    if (!currentCohort.value) return

    const index = currentCohort.value.entryEvents.findIndex(e => e.id === eventId)
    if (index !== -1) {
      currentCohort.value.entryEvents.splice(index, 1)
      isDirty.value = true
    }
  }

  function updateEntryEvent(eventId: string, updatedEvent: CohortEvent) {
    if (!currentCohort.value) return

    const index = currentCohort.value.entryEvents.findIndex(e => e.id === eventId)
    if (index !== -1) {
      currentCohort.value.entryEvents[index] = updatedEvent
      isDirty.value = true
    }
  }

  function ensureCohort() {
    if (!currentCohort.value) {
      createNewCohort()
    }
    return currentCohort.value!
  }

  function addInclusionRule(rule: InclusionRule) {
    ensureCohort().inclusionRules.push(rule)
    isDirty.value = true
  }

  function addConceptSetReference(ref: ConceptSetReference) {
    const cohort = ensureCohort()
    if (!cohort.conceptSets.some(cs => cs.id === ref.id)) {
      cohort.conceptSets.push(ref)
      isDirty.value = true
    }
  }

  function setObservationPeriod(period: ObservationPeriod) {
    ensureCohort().observationPeriod = period
    isDirty.value = true
  }

  function setExitCriteria(exit: ExitCriteria) {
    ensureCohort().exitCriteria = exit
    isDirty.value = true
  }

  function addCensoringCriterion(event: CohortEvent) {
    const cohort = ensureCohort()
    cohort.censoringCriteria = cohort.censoringCriteria ?? []
    cohort.censoringCriteria.push(event)
    isDirty.value = true
  }

  function applyProposal(proposal: AgentProposal) {
    switch (proposal.kind) {
      case 'addEntryEvent':
        addEntryEvent(proposal.event)
        break
      case 'addInclusionRule':
        addInclusionRule(proposal.rule)
        break
      case 'addConceptSet':
        addConceptSetReference(proposal.conceptSet)
        break
      case 'setObservationPeriod':
        setObservationPeriod(proposal.observationPeriod)
        break
      case 'setExitCriteria':
        setExitCriteria(proposal.exitCriteria)
        break
      case 'addCensoringCriterion':
        addCensoringCriterion(proposal.event)
        break
      // Non-cohort proposal kinds are handled by pythiaBridge before
      // reaching the cohort store. Ignore here.
      case 'navigate':
      case 'saveCohort':
      case 'createStandaloneConceptSet':
      case 'createFeatureAnalysis':
      case 'createCharacterization':
      case 'createPathway':
      case 'createIncidenceRate':
      case 'updateConceptSet':
      case 'updateFeatureAnalysis':
      case 'updateCharacterization':
      case 'updatePathway':
      case 'updateIncidenceRate':
        return
      default: {
        const exhaustive: never = proposal
        logger.warn('CohortStore', 'Unknown agent proposal', exhaustive)
        return
      }
    }
    agentRevision.value++
  }

  function clearCohort() {
    currentCohort.value = null
    isDirty.value = false
  }

  function markClean() {
    isDirty.value = false
  }

  function markDirty() {
    isDirty.value = true
  }

  // The WebAPI save and reset-to-blank logic lives in the mounted CohortBuilder,
  // not here. These signals let the host bridge trigger that flow (and await the
  // save) rather than re-implementing the editor's concept-set assembly.
  const saveRequest = ref(0)
  const newCohortSignal = ref(0)
  let saveResolver: ((r: { id?: number; name?: string }) => void) | null = null

  function requestSave(): Promise<{ id?: number; name?: string }> {
    return new Promise(resolve => {
      saveResolver = resolve
      saveRequest.value++
      // Never hang the caller if no editor is mounted to answer the signal.
      setTimeout(() => notifySaved(), 8000)
    })
  }

  function notifySaved(result: { id?: number; name?: string } = {}) {
    const resolve = saveResolver
    saveResolver = null
    resolve?.(result)
  }

  function requestNewCohort() {
    createNewCohort()
    newCohortSignal.value++
  }

  // SessionStorage auto-save
  function saveToDraft() {
    if (!currentCohort.value || !isDirty.value) return

    try {
      const draftData = {
        cohort: currentCohort.value,
        timestamp: new Date().toISOString(),
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
      lastAutoSave.value = new Date()
      logger.debug('CohortStore', 'Draft auto-saved at', lastAutoSave.value)
    } catch (error) {
      logger.error('CohortStore', 'Failed to save draft:', error)
    }
  }

  // SessionStorage restore
  function restoreFromDraft(): boolean {
    try {
      const draftJson = sessionStorage.getItem(STORAGE_KEY)
      if (!draftJson) return false

      const draftData = JSON.parse(draftJson)
      if (draftData.cohort) {
        currentCohort.value = draftData.cohort
        isDirty.value = true // Mark as dirty since it's a draft
        logger.debug('CohortStore', 'Draft restored from', draftData.timestamp)
        return true
      }
    } catch (error) {
      logger.error('CohortStore', 'Failed to restore draft:', error)
      sessionStorage.removeItem(STORAGE_KEY)
    }
    return false
  }

  function clearDraft() {
    sessionStorage.removeItem(STORAGE_KEY)
    lastAutoSave.value = null
  }

  function startAutoSave() {
    if (autoSaveTimer) return // Already running

    autoSaveTimer = setInterval(() => {
      saveToDraft()
    }, AUTO_SAVE_INTERVAL_MS)

    logger.debug('CohortStore', 'Auto-save started (every 30s)')
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer)
      autoSaveTimer = null
      logger.debug('CohortStore', 'Auto-save stopped')
    }
  }

  // Watch for changes and trigger auto-save timer
  watchHandle = watch(isDirty, dirty => {
    if (dirty) {
      startAutoSave()
    }
  })

  // Validation logic
  function validateCohort() {
    const errors: ValidationError[] = []

    if (!currentCohort.value) {
      validationErrors.value = errors
      isReadOnly.value = false
      return
    }

    const cohort = currentCohort.value

    // Check required fields
    if (!cohort.name || cohort.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Cohort name is required',
        severity: 'error',
      })
    }

    if (cohort.entryEvents.length === 0) {
      errors.push({
        field: 'entryEvents',
        message: 'At least one entry event is required',
        severity: 'error',
      })
    }

    // Validate CollapseSettings if present
    if (cohort.collapseSettings) {
      if (!cohort.collapseSettings.collapseType) {
        errors.push({
          field: 'collapseSettings.collapseType',
          message: 'Collapse type is required when collapse settings are specified',
          severity: 'error',
        })
      }
    }

    // Validate CensorWindow dates (literal ISO date strings per Atlas 2.15)
    if (cohort.censorWindow) {
      const { startDate, endDate } = cohort.censorWindow
      if (startDate && endDate && startDate > endDate) {
        errors.push({
          field: 'censorWindow',
          message: 'Censor window start date must come before end date',
          severity: 'warning',
        })
      }
    }

    validationErrors.value = errors
    isReadOnly.value = errors.some(err => err.severity === 'error')
  }

  // Calculate exponential backoff delay
  function calculateBackoffDelay(attempt: number): number {
    const delay = Math.min(
      RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt),
      RETRY_CONFIG.maxDelay
    )
    return delay
  }

  // Load cohort with caching and retry
  async function loadCohort(cohortId: number | string): Promise<CohortDefinition | null> {
    try {
      // TODO: Replace with actual WebAPI call
      // For now, try to load from cache
      const cachedCohort = await getCohortFromCache(cohortId)

      if (cachedCohort) {
        setCohort(cachedCohort)
        logger.debug('CohortStore', `Loaded cohort ${cohortId} from cache`)
        return cachedCohort
      }

      // If not in cache, would normally fetch from WebAPI here
      logger.warn('CohortStore', `Cohort ${cohortId} not found in cache and WebAPI not implemented`)
      return null
    } catch (error) {
      logger.error('CohortStore', 'Failed to load cohort:', error)

      // Try to get from cache as fallback
      return await getCachedCohort(cohortId)
    }
  }

  // Get cohort from cache (fallback when WebAPI fails)
  async function getCachedCohort(cohortId: number | string): Promise<CohortDefinition | null> {
    try {
      const cachedCohort = await getCohortFromCache(cohortId)

      if (cachedCohort) {
        logger.debug('CohortStore', `Loaded cohort ${cohortId} from cache (fallback mode)`)
        setCohort(cachedCohort)
        return cachedCohort
      }

      return null
    } catch (error) {
      logger.error('CohortStore', 'Failed to retrieve cached cohort:', error)
      return null
    }
  }

  // Save cohort with retry logic
  async function saveCohort(): Promise<boolean> {
    if (!currentCohort.value) {
      logger.warn('CohortStore', 'No cohort to save')
      return false
    }

    if (!canSave.value) {
      logger.warn('CohortStore', 'Cannot save cohort: validation errors exist or read-only mode')
      return false
    }

    // Reset retry state
    retryState.value = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    }

    return await saveCohortWithRetry()
  }

  // Internal save with exponential backoff retry
  async function saveCohortWithRetry(): Promise<boolean> {
    if (!currentCohort.value) return false

    try {
      retryState.value.isRetrying = true

      // TODO: Replace with actual WebAPI save call
      // For now, just cache the cohort
      // Convert to plain object to avoid Pinia reactive proxy issues
      const plainCohort = JSON.parse(JSON.stringify(currentCohort.value))
      await saveCohortToCache(plainCohort, 'local')

      logger.info('CohortStore', 'Cohort saved successfully')
      markClean()
      retryState.value.isRetrying = false
      retryState.value.attempt = 0
      retryState.value.nextRetryAt = null

      return true
    } catch (error) {
      logger.error('CohortStore', `Save attempt ${retryState.value.attempt + 1} failed:`, error)

      // Check if we should retry
      if (retryState.value.attempt < RETRY_CONFIG.maxAttempts) {
        retryState.value.attempt++

        const delay = calculateBackoffDelay(retryState.value.attempt - 1)
        retryState.value.nextRetryAt = new Date(Date.now() + delay)

        logger.info(
          'CohortStore',
          `Retrying in ${delay / 1000} seconds (attempt ${retryState.value.attempt}/${RETRY_CONFIG.maxAttempts})`
        )

        // Schedule retry
        return new Promise(resolve => {
          if (retryTimer) {
            clearTimeout(retryTimer)
          }

          retryTimer = setTimeout(async () => {
            const result = await saveCohortWithRetry()
            resolve(result)
          }, delay)
        })
      } else {
        logger.error(
          'CohortStore',
          `Max retry attempts (${RETRY_CONFIG.maxAttempts}) reached. Save failed.`
        )
        retryState.value.isRetrying = false
        return false
      }
    }
  }

  // Cancel pending retry
  function cancelRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }

    retryState.value = {
      attempt: 0,
      nextRetryAt: null,
      isRetrying: false,
    }

    logger.debug('CohortStore', 'Retry cancelled')
  }

  // Delete cohort from cache
  async function deleteCachedCohort(cohortId: number | string): Promise<void> {
    try {
      await deleteCohortFromCache(cohortId)
      logger.debug('CohortStore', `Cohort ${cohortId} deleted from cache`)
    } catch (error) {
      logger.error('CohortStore', 'Failed to delete cached cohort:', error)
    }
  }

  // Version preview actions (T014-T016)

  /**
   * Load a specific version for preview
   * Fetches the historical version data and sets it as current with preview flag
   * @param versionNumber - The version number to load
   */
  async function loadVersionPreview(versionNumber: number): Promise<void> {
    if (!currentCohort.value?.id) {
      logger.error('CohortStore', 'Cannot load version preview: no current cohort ID')
      throw new Error('No current cohort ID')
    }

    try {
      const cohortId = currentCohort.value.id
      const versionedAsset: VersionedAsset<CohortDefinition> = await getVersionAPI(
        cohortId,
        versionNumber
      )

      // Set preview version metadata
      previewVersion.value = versionedAsset.versionDTO

      // Replace current cohort with historical data
      currentCohort.value = versionedAsset.entityDTO

      // Mark as clean (read-only mode, no editing)
      isDirty.value = false

      logger.debug('CohortStore', `Loaded version ${versionNumber} for preview`)
    } catch (error) {
      logger.error('CohortStore', `Failed to load version ${versionNumber}`, error)
      throw error
    }
  }

  /**
   * Clear preview state and reload current version
   * Returns to normal editing mode
   */
  async function clearPreviewVersion(): Promise<void> {
    const wasPreviewingId = currentCohort.value?.id

    // Clear preview state
    previewVersion.value = null

    // Reload current version if we were previewing
    if (wasPreviewingId) {
      await loadCohort(wasPreviewingId)
    }

    logger.debug('CohortStore', 'Preview cleared, returned to current version')
  }

  /**
   * Save the currently previewed version as the new current version
   * Creates a new version with the historical data
   */
  async function savePreviewAsCurrent(): Promise<boolean> {
    if (!previewVersion.value) {
      logger.error('CohortStore', 'Cannot save preview: not in preview mode')
      return false
    }

    if (!currentCohort.value) {
      logger.error('CohortStore', 'Cannot save preview: no cohort data')
      return false
    }

    try {
      // Save the current (historical) data as new version
      const success = await saveCohort()

      if (success) {
        // Clear preview state after successful save
        previewVersion.value = null
        logger.debug('CohortStore', 'Preview saved as current version')
      }

      return success
    } catch (error) {
      logger.error('CohortStore', 'Failed to save preview as current', error)
      return false
    }
  }

  // Cleanup function
  function dispose() {
    if (watchHandle) {
      watchHandle()
      watchHandle = null
    }
    stopAutoSave()
    cancelRetry()
  }

  return {
    // State
    currentCohort,
    isDirty,
    lastAutoSave,
    previewVersion,
    validationErrors,
    isReadOnly,
    retryState,
    agentRevision,
    saveRequest,
    newCohortSignal,
    // Getters
    hasEntryEvents,
    hasInclusionRules,
    entryEventCount,
    hasValidationErrors,
    canSave,
    // Actions
    setCohort,
    createNewCohort,
    addEntryEvent,
    removeEntryEvent,
    updateEntryEvent,
    addInclusionRule,
    addConceptSetReference,
    setObservationPeriod,
    setExitCriteria,
    addCensoringCriterion,
    applyProposal,
    clearCohort,
    markClean,
    markDirty,
    requestSave,
    notifySaved,
    requestNewCohort,
    // Draft management
    saveToDraft,
    restoreFromDraft,
    clearDraft,
    startAutoSave,
    stopAutoSave,
    // Validation
    validateCohort,
    // Caching and retry
    loadCohort,
    getCachedCohort,
    saveCohort,
    cancelRetry,
    deleteCachedCohort,
    // Version preview (T014-T016)
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    // Cleanup
    dispose,
  }
})
