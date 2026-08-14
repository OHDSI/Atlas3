import { ref, computed, watch, type Ref, type ComputedRef, onUnmounted } from 'vue'
import type {
  CensorWindow,
  CohortDefinition,
  CohortEvent,
  CollapseSettings,
  InclusionRule,
  CriteriaGroup,
  ExitCriteria,
  ObservationPeriod,
  ConceptSetReference,
  QualifyingLimit,
  Tag,
} from '@/models/cohort.types'
import type { ValidationWarning, ValidationSeverity } from '@/models/cohort-validation.types'
import type { ConceptSetItem } from '@/models/concept-set.types'
import { validateCohortDefinition } from '@/services/cohort-definition.service'
import { convertInternalToAtlas } from '@/services/atlas-converter'
import { getConceptSetById } from '@/services/concept-set.service'
import { hasNumericConceptSetId } from '@/utils/concept-set-id'
import { logger } from '@/utils/logger'

export interface CohortValidationOptions {
  /** Cohort name ref */
  cohortName: Ref<string>
  /** Cohort description ref */
  cohortDescription: Ref<string>
  /** Cohort ID (for existing cohorts) */
  cohortId: ComputedRef<number | null>
  /** Entry events ref */
  entryEvents: Ref<CohortEvent[]>
  /** Additional criteria ref */
  additionalCriteria: Ref<CriteriaGroup | undefined>
  /** Inclusion rules ref */
  inclusionRules: Ref<InclusionRule[]>
  /** Exit criteria ref */
  exitCriteria: Ref<ExitCriteria>
  /** Censoring criteria ref */
  censoringCriteria: Ref<CohortEvent[]>
  /** Censor window ref */
  censorWindow?: Ref<CensorWindow | null | undefined>
  /** Collapse settings ref */
  collapseSettings?: Ref<CollapseSettings | undefined>
  /** Observation period ref */
  observationPeriod: Ref<{ priorDays: number; postDays: number }>
  /** Qualifying limit ref */
  qualifyingLimit: Ref<QualifyingLimit>
  /** Primary criteria limit ref */
  primaryCriteriaLimit?: Ref<QualifyingLimit | undefined>
  /** Inclusion qualifying limit ref */
  inclusionQualifyingLimit: Ref<QualifyingLimit>
  /**
   * The cohort's own concept sets, i.e. what the `ConceptSets` array holds when
   * the cohort is saved.
   *
   * Validation used to build that array purely from extractConceptSets, which
   * only recognises a set referenced through `event.conceptSet` or an attribute
   * of type 'conceptSet'. References carried on `*CS` attribute fields
   * (VisitTypeCS, DeathTypeCS, ProviderSpecialtyCS, ...) do not survive import
   * in that shape, so those sets were left out of the payload while the criteria
   * still carried their CodesetId. circe then saw a criterion pointing at a
   * codeset nothing defined and reported "It's not specified what type of
   * records to look for ..." for a cohort that has one (#200).
   *
   * Optional: without it the validator falls back to what it can discover.
   */
  definedConceptSets?: () => ConceptSetReference[]
  debounceDelay?: number
}

export interface CohortValidationReturn {
  validationWarnings: Ref<ValidationWarning[]>
  isValidating: ComputedRef<boolean>
  groupedWarningsBySeverity: ComputedRef<Record<ValidationSeverity, ValidationWarning[]>>
  highestSeverity: ComputedRef<ValidationSeverity | null>
  highestSeverityColor: ComputedRef<string>
  usedConceptSets: ComputedRef<ConceptSetReference[]>
  triggerValidation: () => void
  cancelValidation: () => void
  clearWarnings: () => void
}

export function extractConceptSets(
  entryEvents: CohortEvent[],
  additionalCriteria: CriteriaGroup | undefined,
  inclusionRules: InclusionRule[],
  exitCriteria: ExitCriteria,
  censoringCriteria: CohortEvent[]
): ConceptSetReference[] {
  // Key by `id`, not `name`: a concept set's identity is its id (the CodesetId
  // the Atlas expression references). Distinct concept sets can share a name —
  // e.g. two newly-created sets both still on the blank/default name — and
  // keying by name would collapse them, silently dropping every set after the
  // first and leaving criteria pointing at a CodesetId that no longer exists.
  const conceptSetsMap = new Map<number | string, ConceptSetReference>()

  // Mirrors the recursive walk in `utils/concept-set-usages.ts`: a concept
  // set can be referenced not just on `event.conceptSet`, but on a
  // `conceptSet`-type attribute (e.g. VisitTypeCS) or inside a correlated
  // "with" sub-criteria group (`event.nestedCriteria`). Missing either of
  // those made a genuinely-used concept set look unused (#205) and dropped
  // it from the `ConceptSets` array sent for server-side validation (#200).
  function collectFromEvent(event: CohortEvent) {
    // A newly-added criterion is seeded with a placeholder concept set
    // reference (id null, name "Select concept set...") rather than leaving
    // `conceptSet` unset (see GroupCriteriaUI.vue). A bare truthiness check
    // folded that placeholder into the used-concept-sets list, which then
    // got serialized with a fabricated array-index id that could collide
    // with a real, already-selected concept set's id and produce a
    // duplicate-looking "Select Concept Set..." validation warning (#214).
    if (event.conceptSet && event.conceptSet.id != null) {
      conceptSetsMap.set(event.conceptSet.id, event.conceptSet)
    }
    for (const attribute of event.attributes ?? []) {
      if (attribute.type === 'conceptSet' && attribute.conceptSet && attribute.conceptSet.id != null) {
        conceptSetsMap.set(attribute.conceptSet.id, attribute.conceptSet)
      }
    }
    if (event.nestedCriteria) {
      collectFromGroup(event.nestedCriteria)
    }
  }

  function collectFromGroup(group: CriteriaGroup) {
    group.events.forEach(collectFromEvent)
    group.nestedGroups?.forEach(collectFromGroup)
  }

  entryEvents.forEach(collectFromEvent)

  if (additionalCriteria) {
    collectFromGroup(additionalCriteria)
  }

  inclusionRules.forEach(rule => {
    rule.criteriaGroups.forEach(collectFromGroup)
  })

  if (exitCriteria?.conceptSet && exitCriteria.conceptSet.id != null) {
    conceptSetsMap.set(exitCriteria.conceptSet.id, exitCriteria.conceptSet)
  }
  exitCriteria?.censoringEvents?.forEach(collectFromEvent)

  censoringCriteria.forEach(collectFromEvent)

  return Array.from(conceptSetsMap.values())
}

/** Editor state the cohort definition is assembled from. */
export interface CohortEditorState {
  id?: number
  name: string
  description?: string
  tags?: Tag[]
  entryEvents: CohortEvent[]
  additionalCriteria?: CriteriaGroup
  inclusionRules: InclusionRule[]
  exitCriteria?: ExitCriteria
  censorWindow?: CensorWindow | null
  collapseSettings?: CollapseSettings
  censoringCriteria?: CohortEvent[]
  observationPeriod?: ObservationPeriod
  qualifyingLimit: QualifyingLimit
  primaryCriteriaLimit?: QualifyingLimit
  inclusionQualifyingLimit?: QualifyingLimit
  conceptSets: ConceptSetReference[]
}

/**
 * The single assembly point for a CohortDefinition built from editor state.
 * Validation, the live-preview expression and save all go through this, so a
 * cohort can never be validated against a different field set than the one
 * that is converted and sent to the server.
 */
export function assembleCohortDefinition(state: CohortEditorState): CohortDefinition {
  return {
    id: state.id,
    name: state.name,
    description: state.description,
    tags: state.tags,
    entryEvents: state.entryEvents,
    inclusionRules: state.inclusionRules,
    exitCriteria: state.exitCriteria,
    censorWindow: state.censorWindow ?? undefined,
    collapseSettings: state.collapseSettings,
    censoringCriteria: state.censoringCriteria,
    observationPeriod: state.observationPeriod,
    qualifyingLimit: state.qualifyingLimit,
    primaryCriteriaLimit: state.primaryCriteriaLimit,
    inclusionQualifyingLimit: state.inclusionQualifyingLimit,
    conceptSets: state.conceptSets,
    ...(state.additionalCriteria !== undefined ? { additionalCriteria: state.additionalCriteria } : {}),
  }
}

export async function hydrateConceptSetItems(
  refs: ConceptSetReference[]
): Promise<ConceptSetReference[]> {
  return Promise.all(
    refs.map(async ref => {
      if (ref.items && ref.items.length > 0) {
        return ref
      }

      if (hasNumericConceptSetId(ref)) {
        const fullConceptSet = await getConceptSetById(ref.id)
        if (fullConceptSet && fullConceptSet.items) {
          return {
            ...ref,
            items: fullConceptSet.items as ConceptSetItem[],
          }
        }
      }

      return ref
    })
  )
}

export function useCohortValidation(options: CohortValidationOptions): CohortValidationReturn {
  const {
    cohortName,
    cohortDescription,
    cohortId,
    entryEvents,
    additionalCriteria,
    inclusionRules,
    exitCriteria,
    censoringCriteria,
    observationPeriod,
    qualifyingLimit,
    inclusionQualifyingLimit,
    debounceDelay = 2000,
  } = options
  const primaryCriteriaLimit = options.primaryCriteriaLimit ?? ref<QualifyingLimit | undefined>(undefined)
  const censorWindow = options.censorWindow ?? ref<CensorWindow | null | undefined>(undefined)
  const collapseSettings = options.collapseSettings ?? ref<CollapseSettings | undefined>(undefined)

  const validationWarnings = ref<ValidationWarning[]>([])
  const _isValidatingInternal = ref(false)
  let _isValidatingFlag = false
  let revalidationQueued = false
  let validationDebounceTimer: ReturnType<typeof setTimeout> | null = null

  const isValidating = computed(() => _isValidatingInternal.value)

  const groupedWarningsBySeverity = computed(() => {
    const grouped: Record<ValidationSeverity, ValidationWarning[]> = {
      CRITICAL: [],
      WARNING: [],
      INFO: [],
    }

    validationWarnings.value.forEach((warning: ValidationWarning) => {
      const severityGroup = grouped[warning.severity]
      if (severityGroup) {
        severityGroup.push(warning)
      }
    })

    return grouped
  })

  const highestSeverity = computed((): ValidationSeverity | null => {
    if (validationWarnings.value.length === 0) return null
    if ((groupedWarningsBySeverity.value.CRITICAL?.length ?? 0) > 0) return 'CRITICAL'
    if ((groupedWarningsBySeverity.value.WARNING?.length ?? 0) > 0) return 'WARNING'
    return 'INFO'
  })

  const highestSeverityColor = computed(() => {
    const severity = highestSeverity.value
    if (severity === 'CRITICAL') return 'error'
    if (severity === 'WARNING') return 'warning'
    return 'info'
  })

  const usedConceptSets = computed(() => {
    return extractConceptSets(
      entryEvents.value,
      additionalCriteria.value,
      inclusionRules.value,
      exitCriteria.value,
      censoringCriteria.value
    )
  })

  function conceptSetsForValidation(): ConceptSetReference[] {
    const byId = new Map<number | string, ConceptSetReference>()
    for (const set of options.definedConceptSets?.() ?? []) {
      if (hasNumericConceptSetId(set)) byId.set(set.id, set)
    }
    for (const set of usedConceptSets.value) {
      if (!byId.has(set.id)) byId.set(set.id, set)
    }
    return [...byId.values()]
  }

  async function validateCohort() {
    try {
      _isValidatingFlag = true
      _isValidatingInternal.value = true

      // Union of what the cohort declares and what the criteria reference, so
      // that every CodesetId in the payload resolves and every declared set is
      // still visible to the server's unused-set check.
      const conceptSetsWithItems = await hydrateConceptSetItems(
        conceptSetsForValidation()
      )

      const cohortDef = assembleCohortDefinition({
        id: cohortId.value ?? undefined,
        name: cohortName.value,
        description: cohortDescription.value,
        entryEvents: entryEvents.value,
        additionalCriteria: additionalCriteria.value,
        inclusionRules: inclusionRules.value,
        exitCriteria: exitCriteria.value,
        censorWindow: censorWindow.value,
        collapseSettings: collapseSettings.value,
        censoringCriteria: censoringCriteria.value,
        observationPeriod: observationPeriod.value,
        qualifyingLimit: qualifyingLimit.value,
        primaryCriteriaLimit: primaryCriteriaLimit.value,
        inclusionQualifyingLimit: inclusionQualifyingLimit.value,
        conceptSets: conceptSetsWithItems,
      })

      const atlasExpression = convertInternalToAtlas(cohortDef)

      const nameForValidation = cohortName.value || 'Untitled Cohort'
      const result = await validateCohortDefinition(nameForValidation, atlasExpression)
      if (result.success) {
        validationWarnings.value = result.data.warnings || []
      } else {
        // Surface the failure as a warning (matching the old contract) so the
        // user sees *something* went wrong rather than a silently empty list.
        validationWarnings.value = [
          {
            type: 'DefaultWarning',
            severity: 'WARNING',
            message: `Validation error: ${result.error.message}`,
          },
        ]
      }
    } catch (error) {
      logger.error('CohortValidation', 'Failed to validate cohort', error)
      validationWarnings.value = []
    } finally {
      _isValidatingFlag = false
      _isValidatingInternal.value = false
      // Edits that landed while the request was in flight validated nothing:
      // re-run once for the state they produced. validateCohort writes only
      // `validationWarnings`, which nothing here watches, so the follow-up run
      // cannot queue another one by itself.
      if (revalidationQueued) {
        revalidationQueued = false
        scheduleValidation()
      }
    }
  }

  function scheduleValidation() {
    if (validationDebounceTimer) {
      clearTimeout(validationDebounceTimer)
    }

    validationDebounceTimer = setTimeout(() => {
      validationDebounceTimer = null
      validateCohort()
    }, debounceDelay)
  }

  function triggerValidation() {
    if (_isValidatingFlag) {
      revalidationQueued = true
      return
    }

    scheduleValidation()
  }

  function cancelValidation() {
    revalidationQueued = false
    if (validationDebounceTimer) {
      clearTimeout(validationDebounceTimer)
      validationDebounceTimer = null
    }
  }

  function clearWarnings() {
    validationWarnings.value = []
  }

  const stopWatch = watch(
    [
      cohortName,
      entryEvents,
      additionalCriteria,
      inclusionRules,
      exitCriteria,
      censoringCriteria,
      censorWindow,
      collapseSettings,
      observationPeriod,
      qualifyingLimit,
      primaryCriteriaLimit,
      inclusionQualifyingLimit,
    ],
    () => {
      triggerValidation()
    },
    { deep: true }
  )

  onUnmounted(() => {
    cancelValidation()
    stopWatch()
  })

  return {
    validationWarnings,
    isValidating,
    groupedWarningsBySeverity,
    highestSeverity,
    highestSeverityColor,
    usedConceptSets,
    triggerValidation,
    cancelValidation,
    clearWarnings,
  }
}
