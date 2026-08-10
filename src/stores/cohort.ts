/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CohortDefinition,
} from '@/models/cohort.types'
import type { AgentProposal } from '@/models/agent.types'
import type { Criteria } from '@/components/cohort-editor/circe.types'
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
  const reloadRequest = ref(0)
  const reloadVersion = ref<number | null>(null)

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
  // Getters
  const hasValidationErrors = computed(() => {
    return validationErrors.value.some(err => err.severity === 'error')
  })

  const canSave = computed(() => {
    return !!currentCohort.value && !isReadOnly.value && !hasValidationErrors.value
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
    }
    isDirty.value = false
    clearDraft()
  }

  function applyProposal(proposal: AgentProposal) {
    switch (proposal.kind) {
      case 'setObservationPeriod': {
        if (!currentCohort.value?.expression) return
        if (!currentCohort.value.expression.PrimaryCriteria) {
          currentCohort.value.expression.PrimaryCriteria = {}
        }
        currentCohort.value.expression.PrimaryCriteria.ObservationWindow = {
          PriorDays: proposal.observationPeriod.priorDays,
          PostDays: proposal.observationPeriod.postDays,
        }
        break
      }
      case 'addInclusionRule': {
        if (!currentCohort.value?.expression) return
        if (!currentCohort.value.expression.InclusionRules) {
          currentCohort.value.expression.InclusionRules = []
        }
        currentCohort.value.expression.InclusionRules.push({
          name: proposal.rule.name,
          description: proposal.rule.description,
          // CriteriaGroup expression left empty — agent must follow up with
          // a more specific mutation to populate it.
        })
        break
      }
      case 'addConceptSet': {
        if (!currentCohort.value?.expression) return
        if (!currentCohort.value.expression.ConceptSets) {
          currentCohort.value.expression.ConceptSets = []
        }
        const cs = proposal.conceptSet
        if (typeof cs.id === 'number') {
          // Deduplicate: skip if a concept set with the same id already exists.
          const already = currentCohort.value.expression.ConceptSets.some(s => s.id === cs.id)
          if (!already) {
            currentCohort.value.expression.ConceptSets.push({ id: cs.id, name: cs.name })
          }
        }
        break
      }
      case 'addEntryEvent': {
        // criteriaType from the proposal is the Circe wrapper key (e.g. 'ConditionOccurrence').
        // Demographic goes in DemographicCriteriaList, not CriteriaList — not yet supported here.
        const criteriaType = proposal.event.criteriaType
        if (criteriaType === 'Demographic') {
          logger.warn('CohortStore', 'addEntryEvent: Demographic not supported in PrimaryCriteria.CriteriaList')
          break
        }
        if (!currentCohort.value?.expression) return
        if (!currentCohort.value.expression.PrimaryCriteria) {
          currentCohort.value.expression.PrimaryCriteria = {}
        }
        if (!currentCohort.value.expression.PrimaryCriteria.CriteriaList) {
          currentCohort.value.expression.PrimaryCriteria.CriteriaList = []
        }
        currentCohort.value.expression.PrimaryCriteria.CriteriaList.push(
          { [criteriaType]: {} } as Criteria
        )
        break
      }
      case 'setCohortExit': {
        if (!currentCohort.value?.expression) return
        const ec = proposal.exitCriteria
        switch (ec.strategy) {
          case 'CONTINUOUS_OBSERVATION':
            // Default Circe behavior: no EndStrategy means observation period end.
            delete currentCohort.value.expression.EndStrategy
            break
          case 'FIXED_DURATION':
            currentCohort.value.expression.EndStrategy = {
              DateOffset: {
                DateField: ec.dateField === 'END_DATE' ? 'EndDate' : 'StartDate',
                Offset: ec.offset ?? 0,
              },
            }
            break
          case 'CONTINUOUS_DRUG':
            currentCohort.value.expression.EndStrategy = {
              CustomEra: {
                DrugCodesetId: typeof ec.conceptSet?.id === 'number' ? ec.conceptSet.id : undefined,
                GapDays: ec.surveillanceWindow ?? 0,
                Offset: ec.offset ?? 0,
              },
            }
            break
        }
        break
      }
      case 'addCensoringCriterion': {
        const criteriaType = proposal.event.criteriaType
        if (criteriaType === 'Demographic') {
          logger.warn('CohortStore', 'addCensoringCriterion: Demographic not supported in CensoringCriteria')
          break
        }
        if (!currentCohort.value?.expression) return
        if (!currentCohort.value.expression.CensoringCriteria) {
          currentCohort.value.expression.CensoringCriteria = []
        }
        currentCohort.value.expression.CensoringCriteria.push(
          { [criteriaType]: {} } as Criteria
        )
        break
      }
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
      case 'removeInclusionRule':
      case 'removeEntryEvent':
      case 'setEventLimits':
      case 'addQualifyingCriterion':
      case 'setCensorWindow':
      case 'setEraCollapse':
      case 'useConceptSet':
      case 'generateAnalysis':
        return
      default: {
        logger.warn('CohortStore', 'Unknown agent proposal', proposal)
        return
      }
    }
    agentRevision.value++
    markDirty()
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
  // Name/description the caller wants applied to the cohort before it is saved.
  // The mounted editor reads this when it answers a save request — a cohort
  // built programmatically otherwise has no name and the editor refuses to save.
  const saveOptions = ref<{ name?: string; description?: string }>({})
  type SaveRequestResult = { id?: number; name?: string; timedOut?: boolean }
  type PendingSaveRequest = {
    resolve: (r: SaveRequestResult) => void
    timeoutId: ReturnType<typeof setTimeout>
  }
  const pendingSaveRequests: PendingSaveRequest[] = []

  function requestSave(opts: { name?: string; description?: string } = {}): Promise<SaveRequestResult> {
    return new Promise(resolve => {
      saveOptions.value = opts
      saveRequest.value++
      const pendingRequest: PendingSaveRequest = {
        resolve,
        timeoutId: setTimeout(() => {
          const index = pendingSaveRequests.indexOf(pendingRequest)
          if (index === -1) return
          pendingSaveRequests.splice(index, 1)
          resolve({ timedOut: true })
        }, 8000),
      }
      pendingSaveRequests.push(pendingRequest)
    })
  }

  function notifySaved(result: SaveRequestResult = {}) {
    const pendingRequest = pendingSaveRequests.shift()
    if (!pendingRequest) return
    clearTimeout(pendingRequest.timeoutId)
    pendingRequest.resolve(result)
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

  // Validation logic
  function validateCohort() {
    const errors: ValidationError[] = []

    if (!currentCohort.value) {
      validationErrors.value = errors
      isReadOnly.value = false
      return
    }

    const cohort = currentCohort.value

    if (!cohort.name || cohort.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Cohort name is required',
        severity: 'error',
      })
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
      const versionedAsset = (await getVersionAPI<CohortDefinition>(cohortId, versionNumber)) as VersionedAsset<CohortDefinition>

      // Set preview version metadata
      previewVersion.value = versionedAsset.versionDTO

      // Signal the mounted editor to fetch and hydrate the historical version.
      reloadVersion.value = versionNumber
      reloadRequest.value++

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
    // Clear preview state
    previewVersion.value = null

    // Signal the editor to reload the current cohort version.
    reloadVersion.value = null
    reloadRequest.value++

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
      // Ask the mounted editor to persist the current view of the cohort.
      const result = await requestSave()

      if (result.timedOut) {
        return false
      }

      // Clear preview state after successful save.
      previewVersion.value = null
      logger.debug('CohortStore', 'Preview saved as current version')
      return true
    } catch (error) {
      logger.error('CohortStore', 'Failed to save preview as current', error)
      return false
    }
  }

  // Cleanup function
  function dispose() {
    stopAutoSave()
    cancelRetry()
  }

  return {
    // State
    currentCohort,
    isDirty,
    lastAutoSave,
    previewVersion,
    reloadRequest,
    reloadVersion,
    validationErrors,
    isReadOnly,
    retryState,
    agentRevision,
    saveRequest,
    newCohortSignal,
    saveOptions,
    // Getters
    hasValidationErrors,
    canSave,
    // Actions
    setCohort,
    createNewCohort,
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
