/**
 * Cohort Store
 * Manages current cohort definition state
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

/** Outcome of a save the editor performs on the store's behalf. `timedOut`
 *  means nobody answered the save signal in time — the save may still be in
 *  flight, so it must not be read as "nothing was saved". */
export interface SaveResult {
  id?: number
  name?: string
  timedOut?: boolean
}
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

  // Auto-save timer, owned by the mounted CohortBuilder (start on mount, stop on
  // unmount) so it doesn't keep serialising the cohort on every other screen.
  let autoSaveTimer: ReturnType<typeof setInterval> | null = null

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

  // Removal by what the agent actually knows: the rule's name, or the concept
  // it was built from. It never sees the generated ids.
  function removeInclusionRuleBy(match: { id?: string | number; name?: string }): boolean {
    const rules = currentCohort.value?.inclusionRules
    if (!rules) return false
    const wanted = (match.name ?? '').trim().toLowerCase()
    const idx = rules.findIndex(r =>
      (match.id !== undefined && String(r.id) === String(match.id)) ||
      (!!wanted && String(r.name ?? '').trim().toLowerCase() === wanted))
    if (idx < 0) return false
    rules.splice(idx, 1)
    isDirty.value = true
    return true
  }

  function removeEntryEventBy(match: { conceptId?: number; conceptName?: string }): boolean {
    const events = currentCohort.value?.entryEvents
    if (!events) return false
    const wantedName = (match.conceptName ?? '').trim().toLowerCase()
    const idx = events.findIndex(e => {
      const items = (e.conceptSet?.items ?? []) as Array<Record<string, unknown>>
      return items.some(raw => {
        const c = (raw.concept ?? raw) as Record<string, unknown>
        const id = c.CONCEPT_ID ?? raw.conceptId
        const name = String(c.CONCEPT_NAME ?? raw.conceptName ?? '').trim().toLowerCase()
        return (match.conceptId !== undefined && Number(id) === Number(match.conceptId)) ||
          (!!wantedName && name === wantedName)
      })
    })
    if (idx < 0) return false
    events.splice(idx, 1)
    isDirty.value = true
    return true
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

  // Agent criteria arrive with their concept set embedded on the event and a
  // client-side string uid. CIRCE needs an integer CodesetId plus a matching
  // entry in the cohort's ConceptSets array — convertEventToAtlas only emits
  // CodesetId when the id is a number, so without this the criterion saves as
  // `CodesetId: null` with `ConceptSets: []`, i.e. "any drug exposure" instead
  // of the drug the agent actually picked. Assign a numeric id and register it.
  // Takes anything carrying a `conceptSet` — an event or an exit criterion —
  // because both reference their set by CodesetId and both need it to exist
  // in cohort.conceptSets or the reference dangles.
  function registerEventConceptSet(event: { conceptSet?: CohortEvent['conceptSet'] } | undefined) {
    const cs = event?.conceptSet
    if (!cs) return
    const cohort = ensureCohort()
    if (typeof cs.id !== 'number') {
      const used = cohort.conceptSets
        .map(c => (typeof c.id === 'number' ? c.id : -1))
        .filter(n => n >= 0)
      cs.id = used.length ? Math.max(...used) + 1 : 0
    }
    addConceptSetReference({
      id: cs.id,
      name: cs.name,
      conceptCount: cs.conceptCount,
      // Event items arrive already in ATLAS shape ({ concept: { CONCEPT_ID … } }),
      // but convertInternalToAtlas reads the internal shape (item.conceptId …)
      // and would emit CONCEPT_ID: null for every concept. Normalise here.
      items: (cs.items ?? []).map(raw => {
        const it = raw as Record<string, unknown>
        const c = (it.concept ?? {}) as Record<string, unknown>
        if (it.conceptId !== undefined) return it // already internal shape
        return {
          conceptId: c.CONCEPT_ID,
          conceptName: c.CONCEPT_NAME,
          domainId: c.DOMAIN_ID,
          vocabularyId: c.VOCABULARY_ID,
          conceptClassId: c.CONCEPT_CLASS_ID,
          standardConcept: c.STANDARD_CONCEPT,
          conceptCode: c.CONCEPT_CODE,
          invalidReason: c.INVALID_REASON,
          includeDescendants: it.includeDescendants ?? true,
          isExcluded: it.isExcluded ?? false,
          includeMapped: it.includeMapped ?? false,
        }
      }),
    })
  }

  function registerRuleConceptSets(rule: InclusionRule | undefined) {
    for (const group of rule?.criteriaGroups ?? []) {
      for (const event of group.events ?? []) registerEventConceptSet(event)
    }
  }

  function applyProposal(proposal: AgentProposal) {
    switch (proposal.kind) {
      case 'addEntryEvent':
        registerEventConceptSet(proposal.event)
        if (proposal.replace && currentCohort.value) {
          currentCohort.value.entryEvents = [proposal.event]
          isDirty.value = true
        } else {
          addEntryEvent(proposal.event)
        }
        break
      case 'removeInclusionRule':
        removeInclusionRuleBy(proposal.match)
        break
      case 'removeEntryEvent':
        removeEntryEventBy(proposal.match)
        break
      case 'addInclusionRule':
        registerRuleConceptSets(proposal.rule)
        addInclusionRule(proposal.rule)
        break
      case 'addConceptSet':
        addConceptSetReference(proposal.conceptSet)
        break
      case 'setEventLimits': {
        const c = ensureCohort()
        if (proposal.limits.primaryCriteriaLimit) c.primaryCriteriaLimit = proposal.limits.primaryCriteriaLimit
        if (proposal.limits.qualifyingLimit) c.qualifyingLimit = proposal.limits.qualifyingLimit
        if (proposal.limits.inclusionQualifyingLimit) c.inclusionQualifyingLimit = proposal.limits.inclusionQualifyingLimit
        isDirty.value = true
        break
      }
      case 'addQualifyingCriterion': {
        // "Restrict initial events": criteria that qualify the entry event
        // itself, rather than the person. One group, appended to.
        registerEventConceptSet(proposal.event)
        const c = ensureCohort()
        if (!c.additionalCriteria) {
          c.additionalCriteria = { id: `qualifying-${Date.now()}`, logicType: 'ALL', events: [] }
        }
        c.additionalCriteria.events.push(proposal.event)
        isDirty.value = true
        break
      }
      case 'setCensorWindow': {
        const c = ensureCohort()
        c.censorWindow = proposal.censorWindow
        isDirty.value = true
        break
      }
      case 'setEraCollapse': {
        const c = ensureCohort()
        c.collapseSettings = proposal.collapseSettings
        isDirty.value = true
        break
      }
      case 'setObservationPeriod':
        setObservationPeriod(proposal.observationPeriod)
        break
      case 'setExitCriteria':
        // A CONTINUOUS_DRUG exit emits CustomEra.DrugCodesetId; without this the
        // codeset is never defined and circe resolves the era against nothing.
        registerEventConceptSet(proposal.exitCriteria)
        setExitCriteria(proposal.exitCriteria)
        break
      case 'addCensoringCriterion':
        registerEventConceptSet(proposal.event)
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
      case 'generateAnalysis':
      case 'updateConceptSet':
      case 'updateFeatureAnalysis':
      case 'updateCharacterization':
      case 'updatePathway':
      case 'updateIncidenceRate':
      // useConceptSet is bridge-handled too: it fetches the saved set's
      // concepts and then applies an ordinary criterion proposal, so the store
      // never sees this kind.
      case 'useConceptSet': // eslint-disable-line no-fallthrough
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
  // A queue, not a single slot: overlapping requests are answered in the order
  // they were raised, so each caller gets its own save's result. A single slot
  // cross-wired them — request B's arrival settled A with {}, then A's
  // completion resolved B with A's result, and B's real result was dropped.
  interface PendingSave {
    resolve: (r: { id?: number; name?: string }) => void
    timeoutId: ReturnType<typeof setTimeout>
  }
  const pendingSaves: PendingSave[] = []

  function settleOldestSave(result: SaveResult) {
    const entry = pendingSaves.shift()
    if (!entry) return
    clearTimeout(entry.timeoutId)
    entry.resolve(result)
  }

  function requestSave(opts: { name?: string; description?: string } = {}): Promise<SaveResult> {
    return new Promise(resolve => {
      saveOptions.value = opts
      // Never hang the caller if no editor is mounted to answer the signal.
      // Mark it, so "nobody answered in time" is distinguishable from "the save
      // returned nothing": a WebAPI save slower than this still lands, and a
      // caller told only `{}` would reasonably conclude nothing was saved and
      // save again, leaving two cohorts.
      const timeoutId = setTimeout(() => settleOldestSave({ timedOut: true }), 8000)
      pendingSaves.push({ resolve, timeoutId })
      saveRequest.value++
    })
  }

  function notifySaved(result: SaveResult = {}) {
    settleOldestSave(result)
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
    removeInclusionRuleBy,
    removeEntryEventBy,
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
