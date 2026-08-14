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
import {
  translateAgentEvent,
  translateAgentCriteriaGroups,
  registerConceptSets,
} from '@/stores/agent-proposal-circe'
import {
  circeConceptSetFromAtlas,
  type AtlasConceptSetItem,
} from '@/components/cohort-editor/atlas-concept-set'

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
  /**
   * `untranslatable-criteria` covers a proposal whose payload cannot be
   * expressed in circe — a criterion with no domain to key its wrapper on, or a
   * concept set with no numeric id for a CodesetId to reference. These used to
   * be applied partially and reported as success, which left the cohort holding
   * a criterion that matched its whole domain.
   */
  reason?: 'no-document' | 'unsupported-kind' | 'no-match' | 'untranslatable-criteria'
}

const RESULT_LIMIT_TYPES = { ALL: 'All', FIRST: 'First', LAST: 'Last' } as const

// ATLAS 2.15's InputTypes/Window and InputTypes/Occurrence defaults: a
// qualifying criterion starts out unbounded on both sides of the index date and
// requires at least one occurrence.
function defaultQualifyingWindow() {
  return {
    Start: { Days: null, Coeff: -1 as const },
    End: { Days: null, Coeff: 1 as const },
    UseIndexEnd: false,
    UseEventEnd: false,
  }
}

// A criterion names its concepts only through CodesetId, so resolving one back
// to a concept means walking the expression's ConceptSets.
function codesetIdsMatching(
  expression: CohortExpression,
  match: { conceptId?: number; conceptName?: string }
): Set<number> {
  const wanted = match.conceptName?.trim().toLowerCase()
  const ids = new Set<number>()
  for (const set of expression.ConceptSets ?? []) {
    const hit = (set.expression?.items ?? []).some(item => {
      const concept = item.concept
      if (!concept) return false
      if (match.conceptId !== undefined && concept.CONCEPT_ID === match.conceptId) return true
      return wanted !== undefined && concept.CONCEPT_NAME?.trim().toLowerCase() === wanted
    })
    if (hit && typeof set.id === 'number') ids.add(set.id)
  }
  return ids
}

function criterionCodesetId(criteria: Criteria): number | undefined {
  const body = Object.values(criteria)[0] as { CodesetId?: number | null } | undefined
  return typeof body?.CodesetId === 'number' ? body.CodesetId : undefined
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
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }

        // The rule's criteriaGroups used to be dropped, so an exclusion rule
        // built with a zero-occurrence cardinality saved with an empty
        // expression and excluded nobody, while applyProposal still reported
        // success.
        const translated = translateAgentCriteriaGroups(
          proposal.rule.criteriaGroups,
          expression.ConceptSets
        )
        if (translated.dropped > 0) {
          return { applied: false, reason: 'untranslatable-criteria' }
        }

        registerConceptSets(expression.ConceptSets, translated.conceptSets)
        expression.InclusionRules.push({
          name: proposal.rule.name,
          description: proposal.rule.description,
          expression: translated.group,
        })
        break
      }
      case 'addConceptSet': {
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }
        // The items were previously discarded, so the set landed in the cohort
        // empty and every criterion referencing it matched nobody — while
        // applyProposal still reported success. A set with no numeric id cannot
        // be referenced by a CodesetId at all, so that is refused rather than
        // skipped silently.
        const cs = proposal.conceptSet
        const circeSet = circeConceptSetFromAtlas(
          { id: cs.id, name: cs.name, items: cs.items as AtlasConceptSetItem[] | undefined },
          expression.ConceptSets
        )
        if (!circeSet) {
          return { applied: false, reason: 'untranslatable-criteria' }
        }

        registerConceptSets(expression.ConceptSets, [circeSet])
        break
      }
      case 'addEntryEvent': {
        // criteriaType from the proposal is the Circe wrapper key (e.g. 'ConditionOccurrence').
        // Demographic goes in DemographicCriteriaList, not CriteriaList — not yet supported here.
        const criteriaType = proposal.event.criteriaType
        if (criteriaType === 'Demographic') {
          logger.warn('CohortStore', 'addEntryEvent: Demographic not supported in PrimaryCriteria.CriteriaList')
          return { applied: false, reason: 'unsupported-kind' }
        }

        // Previously pushed `{ [criteriaType]: {} }`, dropping the concept set
        // the agent attached — so "add a diabetes entry event" reached
        // generation as every condition occurrence in the database.
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }
        const translated = translateAgentEvent(proposal.event, expression.ConceptSets)
        if (!translated) {
          return { applied: false, reason: 'untranslatable-criteria' }
        }

        if (!expression.PrimaryCriteria) {
          expression.PrimaryCriteria = {}
        }
        if (!expression.PrimaryCriteria.CriteriaList) {
          expression.PrimaryCriteria.CriteriaList = []
        }
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }

        if (translated.conceptSet) {
          registerConceptSets(expression.ConceptSets, [translated.conceptSet])
        }

        // `replace` is what distinguishes "set the entry event" from "add
        // another one". It was never read, so set_entry_event left the previous
        // entry event in place and the cohort qualified on either.
        if (proposal.replace) {
          expression.PrimaryCriteria.CriteriaList.length = 0
        }
        expression.PrimaryCriteria.CriteriaList.push(translated.criteria)
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
          case 'CONTINUOUS_DRUG': {
            if (!expression.ConceptSets) {
              expression.ConceptSets = []
            }

            // The drug concept set was previously dropped whenever its id was
            // not already numeric — which is the normal case, since translate.ts
            // mints a string uid — leaving CustomEra with no DrugCodesetId at
            // all. Registering the set first gives the strategy something to
            // point at.
            const drugSet = ec.conceptSet
              ? circeConceptSetFromAtlas(
                  {
                    id: ec.conceptSet.id,
                    name: ec.conceptSet.name,
                    items: ec.conceptSet.items as AtlasConceptSetItem[] | undefined,
                  },
                  expression.ConceptSets
                )
              : undefined
            if (drugSet) {
              registerConceptSets(expression.ConceptSets, [drugSet])
            }

            // Atlas 2.15 binds Persistence to GapDays and Surveillance to
            // Offset (CustomEraStrategyTemplate.html). GapDays was being fed
            // the surveillance window while the persistence window was never
            // read at all, so the era was built with the wrong tolerance.
            expression.EndStrategy = {
              CustomEra: {
                DrugCodesetId: drugSet?.id,
                GapDays: ec.persistenceWindow ?? 0,
                Offset: ec.surveillanceWindow ?? ec.offset ?? 0,
              },
            }
            break
          }
          default:
            // Anything else (e.g. CUSTOM_EVENT, which translate.ts can emit)
            // has no representation here. Reporting it beats bumping
            // agentRevision and marking the cohort dirty for a mutation that
            // changed nothing.
            logger.warn('CohortStore', `setCohortExit: unsupported strategy "${ec.strategy}"`)
            return { applied: false, reason: 'unsupported-kind' }
        }
        break
      }
      case 'addCensoringCriterion': {
        const criteriaType = proposal.event.criteriaType
        if (criteriaType === 'Demographic') {
          logger.warn('CohortStore', 'addCensoringCriterion: Demographic not supported in CensoringCriteria')
          return { applied: false, reason: 'unsupported-kind' }
        }

        // Same defect as addEntryEvent: the concept set was dropped, so the
        // censoring criterion censored on the whole domain.
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }
        const translated = translateAgentEvent(proposal.event, expression.ConceptSets)
        if (!translated) {
          return { applied: false, reason: 'untranslatable-criteria' }
        }

        if (!expression.CensoringCriteria) {
          expression.CensoringCriteria = []
        }
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }

        if (translated.conceptSet) {
          registerConceptSets(expression.ConceptSets, [translated.conceptSet])
        }
        expression.CensoringCriteria.push(translated.criteria)
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
      case 'setEventLimits': {
        const { primaryCriteriaLimit, qualifyingLimit, inclusionQualifyingLimit } = proposal.limits
        if (!primaryCriteriaLimit && !qualifyingLimit && !inclusionQualifyingLimit) {
          logger.warn('CohortStore', 'setEventLimits: no limit was named')
          return { applied: false, reason: 'unsupported-kind' }
        }
        if (primaryCriteriaLimit) {
          if (!expression.PrimaryCriteria) {
            expression.PrimaryCriteria = {}
          }
          expression.PrimaryCriteria.PrimaryCriteriaLimit = {
            Type: RESULT_LIMIT_TYPES[primaryCriteriaLimit],
          }
        }
        if (qualifyingLimit) {
          expression.QualifiedLimit = { Type: RESULT_LIMIT_TYPES[qualifyingLimit] }
        }
        if (inclusionQualifyingLimit) {
          expression.ExpressionLimit = { Type: RESULT_LIMIT_TYPES[inclusionQualifyingLimit] }
        }
        break
      }
      case 'setCensorWindow': {
        const { startDate, endDate } = proposal.censorWindow
        if (!startDate && !endDate) {
          logger.warn('CohortStore', 'setCensorWindow: neither bound was given')
          return { applied: false, reason: 'unsupported-kind' }
        }
        // A censor window is one claim about the study period, so an unnamed
        // bound means "open", not "keep whatever was there".
        expression.CensorWindow = {
          ...(startDate ? { StartDate: startDate } : {}),
          ...(endDate ? { EndDate: endDate } : {}),
        }
        break
      }
      case 'setEraCollapse': {
        const { collapseType, eraPad } = proposal.collapseSettings
        if (collapseType !== 'ERA') {
          logger.warn('CohortStore', `setEraCollapse: circe has no "${collapseType}" collapse rule`)
          return { applied: false, reason: 'unsupported-kind' }
        }
        expression.CollapseSettings = { CollapseType: 'ERA', EraPad: eraPad }
        break
      }
      case 'addQualifyingCriterion': {
        const criteriaType = proposal.event.criteriaType
        if (criteriaType === 'Demographic') {
          logger.warn('CohortStore', 'addQualifyingCriterion: Demographic qualifiers are not supported')
          return { applied: false, reason: 'unsupported-kind' }
        }
        if (!expression.ConceptSets) {
          expression.ConceptSets = []
        }

        // Same defect as addEntryEvent: the qualifier was built as an empty
        // criterion, so it restricted the entry event to its whole domain.
        const translated = translateAgentEvent(proposal.event, expression.ConceptSets)
        if (!translated) {
          return { applied: false, reason: 'untranslatable-criteria' }
        }

        if (!expression.AdditionalCriteria) {
          expression.AdditionalCriteria = { Type: 'ALL', CriteriaList: [] }
        }
        if (!expression.AdditionalCriteria.CriteriaList) {
          expression.AdditionalCriteria.CriteriaList = []
        }

        if (translated.conceptSet) {
          registerConceptSets(expression.ConceptSets, [translated.conceptSet])
        }
        expression.AdditionalCriteria.CriteriaList.push({
          Criteria: translated.criteria,
          StartWindow: defaultQualifyingWindow(),
          Occurrence: { Type: 2, Count: 1 },
          RestrictVisit: false,
          IgnoreObservationPeriod: false,
        })
        break
      }
      case 'removeInclusionRule': {
        const name = proposal.match.name?.trim()
        if (!name) {
          // Circe inclusion rules carry a name and nothing else, so an id has
          // nothing to match against — guessing at a list index would remove
          // whichever rule happened to sit there.
          logger.warn('CohortStore', 'removeInclusionRule: a circe inclusion rule has no id to match')
          return { applied: false, reason: 'unsupported-kind' }
        }
        const rules = expression.InclusionRules ?? []
        const kept = rules.filter(rule => rule.name?.trim() !== name)
        if (kept.length === rules.length) {
          return { applied: false, reason: 'no-match' }
        }
        expression.InclusionRules = kept
        break
      }
      case 'removeEntryEvent': {
        const codesetIds = codesetIdsMatching(expression, proposal.match)
        const criteriaList = expression.PrimaryCriteria?.CriteriaList ?? []
        const kept = criteriaList.filter(criteria => {
          const codesetId = criterionCodesetId(criteria)
          return codesetId === undefined || !codesetIds.has(codesetId)
        })
        if (kept.length === criteriaList.length) {
          return { applied: false, reason: 'no-match' }
        }
        // The concept set stays: inclusion rules and censoring criteria may
        // still reference the same CodesetId.
        expression.PrimaryCriteria!.CriteriaList = kept
        break
      }
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
