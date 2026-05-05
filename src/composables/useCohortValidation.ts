import { ref, computed, watch, type Ref, type ComputedRef, onUnmounted } from 'vue'
import type {
  CohortDefinition,
  CohortEvent,
  InclusionRule,
  CriteriaGroup,
  ExitCriteria,
  ConceptSetReference,
  QualifyingLimit,
} from '@/models/cohort.types'
import type { ValidationWarning, ValidationSeverity } from '@/models/cohort-validation.types'
import type { ConceptSetItem } from '@/models/concept-set.types'
import { validateCohortDefinition } from '@/services/webapi'
import { convertInternalToAtlas } from '@/services/atlas-converter'
import { getConceptSetById } from '@/services/concept-set.service'
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
  /** Observation period ref */
  observationPeriod: Ref<{ priorDays: number; postDays: number }>
  /** Qualifying limit ref */
  qualifyingLimit: Ref<QualifyingLimit>
  /** Primary criteria limit ref */
  primaryCriteriaLimit: Ref<QualifyingLimit | undefined>
  /** Inclusion qualifying limit ref */
  inclusionQualifyingLimit: Ref<QualifyingLimit>
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

function extractConceptSets(
  entryEvents: CohortEvent[],
  additionalCriteria: CriteriaGroup | undefined,
  inclusionRules: InclusionRule[],
  exitCriteria: ExitCriteria,
  censoringCriteria: CohortEvent[]
): ConceptSetReference[] {
  const conceptSetsMap = new Map<string, ConceptSetReference>()

  // Extract from entry events
  entryEvents.forEach(event => {
    if (event.conceptSet) {
      conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
    }
  })

  // Extract from additional criteria
  if (additionalCriteria?.events) {
    additionalCriteria.events.forEach(event => {
      if (event.conceptSet) {
        conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
      }
    })
  }

  // Extract from inclusion rules
  inclusionRules.forEach(rule => {
    rule.criteriaGroups.forEach(group => {
      group.events.forEach(event => {
        if (event.conceptSet) {
          conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
        }
      })
    })
  })

  // Extract from exit criteria (drug exposure)
  if (exitCriteria?.conceptSet) {
    conceptSetsMap.set(exitCriteria.conceptSet.name, exitCriteria.conceptSet)
  }

  // Extract from censoring criteria
  censoringCriteria.forEach(event => {
    if (event.conceptSet) {
      conceptSetsMap.set(event.conceptSet.name, event.conceptSet)
    }
  })

  return Array.from(conceptSetsMap.values())
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
    primaryCriteriaLimit,
    inclusionQualifyingLimit,
    debounceDelay = 2000,
  } = options

  const validationWarnings = ref<ValidationWarning[]>([])
  const _isValidatingInternal = ref(false)
  let _isValidatingFlag = false
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

  async function validateCohort() {
    try {
      _isValidatingFlag = true
      _isValidatingInternal.value = true

      const conceptSetsWithItems: ConceptSetReference[] = await Promise.all(
        usedConceptSets.value.map(async ref => {
          if (ref.items && ref.items.length > 0) {
            return ref
          }

          if (ref.id) {
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

      const cohortDef: CohortDefinition = {
        id: cohortId.value ?? undefined,
        name: cohortName.value,
        description: cohortDescription.value,
        entryEvents: entryEvents.value,
        additionalCriteria: additionalCriteria.value,
        inclusionRules: inclusionRules.value,
        exitCriteria: exitCriteria.value,
        observationPeriod: observationPeriod.value,
        qualifyingLimit: qualifyingLimit.value,
        primaryCriteriaLimit: primaryCriteriaLimit.value,
        inclusionQualifyingLimit: inclusionQualifyingLimit.value,
        conceptSets: conceptSetsWithItems,
      }

      const atlasExpression = convertInternalToAtlas(cohortDef)

      const nameForValidation = cohortName.value || 'Untitled Cohort'
      const result = await validateCohortDefinition(nameForValidation, atlasExpression)
      validationWarnings.value = result.warnings || []
    } catch (error) {
      logger.error('CohortValidation', 'Failed to validate cohort', error)
      validationWarnings.value = []
    } finally {
      _isValidatingFlag = false
      _isValidatingInternal.value = false
    }
  }

  function triggerValidation() {
    if (_isValidatingFlag) {
      return
    }

    if (validationDebounceTimer) {
      clearTimeout(validationDebounceTimer)
    }

    validationDebounceTimer = setTimeout(() => {
      validateCohort()
    }, debounceDelay)
  }

  function cancelValidation() {
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
