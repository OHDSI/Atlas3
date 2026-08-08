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
import type { Version } from '@/components/versions/types'
import { getVersion as getVersionAPI } from '@/services/cohort-definition-versions.service'
import { logger } from '@/utils/logger'

const STORAGE_KEY = 'atlas3_cohort_draft'
const AUTO_SAVE_INTERVAL_MS = 30000 // 30 seconds

interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning'
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

  // Auto-save timer
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null
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
  // Bumped to ask the mounted editor to (re)fetch and resync. `reloadVersion`
  // carries the target: null means "current version" (loadCohort), a number
  // means that specific historical version (used entering preview).
  const reloadRequest = ref(0)
  const reloadVersion = ref<number | null>(null)
  // Name/description the caller wants applied to the cohort before it is saved.
  // The mounted editor reads this when it answers a save request — a cohort
  // built programmatically otherwise has no name and the editor refuses to save.
  const saveOptions = ref<{ name?: string; description?: string }>({})
  let saveResolver: ((r: { id?: number; name?: string }) => void) | null = null
  let saveTimeoutId: ReturnType<typeof setTimeout> | null = null

  function requestSave(opts: { name?: string; description?: string } = {}): Promise<{ id?: number; name?: string }> {
    // Clear any timer from a still-in-flight prior request so its timeout
    // can't fire later and resolve *this* request's promise instead.
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId)
      saveTimeoutId = null
    }
    // Only one resolver slot exists, so replacing it below would otherwise
    // strand a still-pending prior request's promise forever (its own timer
    // was just cleared, and nothing else will ever settle it). Settle it now.
    if (saveResolver) {
      const prev = saveResolver
      saveResolver = null
      prev({})
    }
    return new Promise(resolve => {
      saveOptions.value = opts
      saveResolver = resolve
      saveRequest.value++
      // Never hang the caller if no editor is mounted to answer the signal.
      saveTimeoutId = setTimeout(() => notifySaved(), 8000)
    })
  }

  function notifySaved(result: { id?: number; name?: string } = {}) {
    // Clear the fallback timer so a save that resolves early can't leave an
    // orphaned timeout that later fires and steals the *next* request's
    // resolver (which would report that later save as failed/empty and drop
    // its real result, since saveResolver would already be null by then).
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId)
      saveTimeoutId = null
    }
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

  // Version preview actions (T014-T016)

  /**
   * Load a specific version for preview
   * Fetches the version metadata and asks the mounted editor to fetch,
   * convert, and resync from that version's Atlas-shaped data.
   *
   * `getVersionAPI`'s `entityDTO` is the raw Atlas-shaped DTO the WebAPI
   * returns (id/name/description/expression-as-JSON-string), not an internal
   * `CohortDefinition` — it must go through the same convertAtlasToInternal
   * path `loadCohort` uses, which only the mounted `CohortBuilder` knows how
   * to run and resync into its ~12 local refs. So this only fetches the
   * version metadata and signals; it never assigns entityDTO to
   * `currentCohort` directly.
   * @param versionNumber - The version number to load
   */
  async function loadVersionPreview(versionNumber: number): Promise<void> {
    if (!currentCohort.value?.id) {
      logger.error('CohortStore', 'Cannot load version preview: no current cohort ID')
      throw new Error('No current cohort ID')
    }

    try {
      const cohortId = currentCohort.value.id
      const versionedAsset = await getVersionAPI(cohortId, versionNumber)

      // Set preview version metadata
      previewVersion.value = versionedAsset.versionDTO

      // Ask the mounted editor to fetch + convert + resync this version.
      reloadVersion.value = versionNumber
      reloadRequest.value++

      logger.debug('CohortStore', `Requested version ${versionNumber} for preview`)
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
    previewVersion.value = null

    if (wasPreviewingId) {
      reloadVersion.value = null
      reloadRequest.value++
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
      const saved = await requestSave()

      if (!saved?.id) {
        logger.error('CohortStore', 'Preview save was not confirmed by the editor')
        return false
      }

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
    if (watchHandle) {
      watchHandle()
      watchHandle = null
    }
    stopAutoSave()
  }

  return {
    // State
    currentCohort,
    isDirty,
    lastAutoSave,
    previewVersion,
    validationErrors,
    isReadOnly,
    agentRevision,
    saveRequest,
    newCohortSignal,
    reloadRequest,
    reloadVersion,
    saveOptions,
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
    // Version preview (T014-T016)
    loadVersionPreview,
    clearPreviewVersion,
    savePreviewAsCurrent,
    // Cleanup
    dispose,
  }
})
