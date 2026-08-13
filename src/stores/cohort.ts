/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, shallowRef, computed, type Ref, type ShallowRef } from 'vue'
import type {
  CohortDefinition,
} from '@/models/cohort.types'
import type { AgentProposal } from '@/models/agent.types'
import type { Criteria, CohortExpression } from '@/components/cohort-editor/circe.types'
import type { Version } from '@/components/versions/types'
import { getVersion as getVersionAPI } from '@/services/cohort-definition-versions.service'
import { logger } from '@/utils/logger'

const STORAGE_KEY = 'atlas3_cohort_draft'
export const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

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

/**
 * The cohort as the store knows it: metadata it owns, plus a reference to the
 * expression the mounted editor owns. `expression` is absent while no editor is
 * attached, which is why it is optional here but required on CohortDefinition.
 */
export type CohortDocument = Omit<CohortDefinition, 'expression'> & {
  expression?: CohortExpression
}

export interface ProposalResult {
  applied: boolean
  reason?: 'no-document' | 'unsupported-kind'
}

interface RetryState {
  attempt: number
  nextRetryAt: Date | null
  isRetrying: boolean
}

export const useCohortStore = defineStore('cohort', () => {
  // State
  const currentCohort = ref<CohortDocument | null>(null)
  const isDirty = ref(false)
  const lastAutoSave = ref<Date | null>(null)

  // The one cohort document. The mounted editor owns the instance and lends it
  // here for the lifetime of the editing session; the store never makes a copy,
  // so an agent proposal and a keystroke in the UI land in the same object and
  // neither can overwrite the other.
  const cohortDocument: ShallowRef<Ref<CohortExpression> | null> = shallowRef(null)
  const hasCohortDocument = computed(() => cohortDocument.value !== null)

  /**
   * Point `currentCohort.expression` at the attached document, first moving any
   * definition the caller supplied into it. The move is in place: consumers hold
   * the expression object itself rather than the ref, so replacing the instance
   * would silently detach them.
   */
  function adoptDocument() {
    const attached = cohortDocument.value
    if (!attached) return

    const incoming = currentCohort.value?.expression
    if (incoming && incoming !== attached.value) {
      const target = attached.value as Record<string, unknown>
      for (const key of Object.keys(target)) delete target[key]
      Object.assign(target, incoming)
    }
    if (currentCohort.value) currentCohort.value.expression = attached.value
  }

  function attachExpression(expression: Ref<CohortExpression>) {
    cohortDocument.value = expression
    adoptDocument()
  }

  /**
   * Pass the editor's own ref so that an incoming editor which attached before
   * the outgoing one unmounted is not detached by it.
   *
   * The metadata outlives the editor — pythiaBridge navigates back to the cohort
   * by id — but the expression does not: the next editor adopts whatever
   * `currentCohort.expression` holds, so leaving the closed session's document
   * there opens New Cohort on the previous cohort's criteria.
   */
  function detachExpression(expression?: Ref<CohortExpression>) {
    if (expression && cohortDocument.value !== expression) return
    cohortDocument.value = null
    if (currentCohort.value) delete currentCohort.value.expression
  }

  // Version preview state (T013)
  const previewVersion = ref<Version | null>(null)
  const reloadRequest = ref(0)

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

  // Copied rather than stored by reference so that adoptDocument's rewrite of
  // `expression` cannot reach back into the caller's own definition object.
  function setCohort(cohort: CohortDocument) {
    currentCohort.value = { ...cohort }
    adoptDocument()
    isDirty.value = false
    validateCohort()
  }

  function createNewCohort() {
    currentCohort.value = {
      name: 'New Cohort',
      expression: {} as CohortExpression,
    }
    previewVersion.value = null
    adoptDocument()
    isDirty.value = false
    clearDraft()
  }

  function applyProposal(proposal: AgentProposal): ProposalResult {
    const expression = cohortDocument.value?.value
    if (!expression) {
      logger.error(
        'CohortStore',
        `Cannot apply "${proposal?.kind}": no cohort document is attached (no editor is open)`
      )
      return { applied: false, reason: 'no-document' }
    }

    switch (proposal.kind) {
      case 'setObservationPeriod': {
        if (!expression.PrimaryCriteria) {
          expression.PrimaryCriteria = {}
        }
        expression.PrimaryCriteria.ObservationWindow = {
          PriorDays: proposal.observationPeriod.priorDays,
          PostDays: proposal.observationPeriod.postDays,
        }
        break
      }
      case 'addInclusionRule': {
        if (!expression.InclusionRules) {
          expression.InclusionRules = []
        }
        expression.InclusionRules.push({
          name: proposal.rule.name,
          description: proposal.rule.description,
          // CriteriaGroup expression left empty — agent must follow up with
          // a more specific mutation to populate it.
        })
        break
      }
      case 'addConceptSet': {
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }
        const cs = proposal.conceptSet
        if (typeof cs.id === 'number') {
          // Deduplicate: skip if a concept set with the same id already exists.
          const already = expression.ConceptSets.some(s => s.id === cs.id)
          if (!already) {
            expression.ConceptSets.push({ id: cs.id, name: cs.name })
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
        if (!expression.PrimaryCriteria) {
          expression.PrimaryCriteria = {}
        }
        if (!expression.PrimaryCriteria.CriteriaList) {
          expression.PrimaryCriteria.CriteriaList = []
        }
        expression.PrimaryCriteria.CriteriaList.push(
          { [criteriaType]: {} } as Criteria
        )
        break
      }
      case 'setCohortExit': {
        const ec = proposal.exitCriteria
        switch (ec.strategy) {
          case 'CONTINUOUS_OBSERVATION':
            // Default Circe behavior: no EndStrategy means observation period end.
            delete expression.EndStrategy
            break
          case 'FIXED_DURATION':
            expression.EndStrategy = {
              DateOffset: {
                DateField: ec.dateField === 'END_DATE' ? 'EndDate' : 'StartDate',
                Offset: ec.offset ?? 0,
              },
            }
            break
          case 'CONTINUOUS_DRUG':
            expression.EndStrategy = {
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
        if (!expression.CensoringCriteria) {
          expression.CensoringCriteria = []
        }
        expression.CensoringCriteria.push(
          { [criteriaType]: {} } as Criteria
        )
        break
      }
      // Non-cohort proposal kinds. pythiaBridge routes these to their own
      // handler and they never reach this switch in practice; reaching one
      // here means the bridge was bypassed, so refuse rather than pretend.
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
      case 'useConceptSet':
      case 'generateAnalysis':
        return { applied: false, reason: 'unsupported-kind' }
      // Cohort kinds translate.ts emits that nothing implements yet. The
      // bridge does not intercept them, so the agent's change is genuinely
      // dropped — the refusal is what keeps that visible.
      case 'removeInclusionRule':
      case 'removeEntryEvent':
      case 'setEventLimits':
      case 'addQualifyingCriterion':
      case 'setCensorWindow':
      case 'setEraCollapse':
        logger.warn('CohortStore', `Cohort proposal "${proposal.kind}" is not implemented yet`)
        return { applied: false, reason: 'unsupported-kind' }
      default: {
        logger.warn('CohortStore', 'Unknown agent proposal', proposal)
        return { applied: false, reason: 'unsupported-kind' }
      }
    }
    markDirty()
    return { applied: true }
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
        adoptDocument()
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

  // Version preview actions (T014-T016)

  /**
   * Load a specific version for preview
   * Fetches the historical version data and sets it as current with preview flag
   * @param versionNumber - The version number to load
   * @param cohortId - Cohort to load from; required when no cohort is open yet
   *                   (a bookmarked version URL previews before the editor mounts)
   */
  async function loadVersionPreview(versionNumber: number, cohortId?: number): Promise<void> {
    const id = cohortId ?? currentCohort.value?.id
    if (!id) {
      logger.error('CohortStore', 'Cannot load version preview: no current cohort ID')
      throw new Error('No current cohort ID')
    }

    try {
      const versionedAsset = await getVersionAPI(id, versionNumber)

      // Set preview version metadata
      previewVersion.value = versionedAsset.versionDTO

      // The version response already carries the historical definition, parsed.
      setCohort({ ...versionedAsset.entityDTO, id: versionedAsset.entityDTO.id ?? id })

      // Signal the mounted editor to re-read the definition: the preview routes
      // keep the same :id, so its own load triggers never fire.
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
    reloadRequest.value++

    logger.debug('CohortStore', 'Preview cleared, returned to current version')
  }

  /**
   * Drop preview state for a caller that is already loading a definition.
   * clearPreviewVersion would bump reloadRequest and send the editor back
   * through the very load that is asking for the preview to end.
   */
  function discardPreview(): void {
    previewVersion.value = null
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
    validationErrors,
    isReadOnly,
    retryState,
    saveRequest,
    newCohortSignal,
    saveOptions,
    // Getters
    hasValidationErrors,
    canSave,
    hasCohortDocument,
    // Document ownership
    attachExpression,
    detachExpression,
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
    // Save and retry
    saveCohort,
    cancelRetry,
    // Version preview (T014-T016)
    loadVersionPreview,
    clearPreviewVersion,
    discardPreview,
    savePreviewAsCurrent,
    // Cleanup
    dispose,
  }
})
