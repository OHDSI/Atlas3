/**
 * Composable for cohort definition validation
 * Extracts validation logic from CohortBuilder.vue for better maintainability
 */
import { ref, computed, watch, type Ref, type ComputedRef, onUnmounted } from 'vue'
import type { CohortDefinition, CohortEvent, InclusionRule, CriteriaGroup, ExitCriteria, ConceptSetReference, QualifyingLimit } from '@/models/cohort.types'
import type { ValidationWarning, ValidationSeverity } from '@/models/cohort-validation.types'
import { validateCohortDefinition } from '@/services/webapi'
import { convertInternalToAtlas } from '@/services/atlas-converter'
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
  /** Inclusion qualifying limit ref */
  inclusionQualifyingLimit: Ref<QualifyingLimit>
  /** Debounce delay in milliseconds (default: 2000) */
  debounceDelay?: number
}

export interface CohortValidationReturn {
  /** Validation warnings from the API */
  validationWarnings: Ref<ValidationWarning[]>
  /** Whether validation is in progress */
  isValidating: ComputedRef<boolean>
  /** Warnings grouped by severity */
  groupedWarningsBySeverity: ComputedRef<Record<ValidationSeverity, ValidationWarning[]>>
  /** Highest severity level of current warnings */
  highestSeverity: ComputedRef<ValidationSeverity | null>
  /** Vuetify color for highest severity */
  highestSeverityColor: ComputedRef<string>
  /** All unique concept sets used in the cohort */
  usedConceptSets: ComputedRef<ConceptSetReference[]>
  /** Manually trigger validation */
  triggerValidation: () => void
  /** Cancel any pending validation */
  cancelValidation: () => void
  /** Clear all validation warnings */
  clearWarnings: () => void
}

/**
 * Extract all unique concept sets from cohort components
 */
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

/**
 * Composable for cohort validation with debounced auto-validation
 */
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

  // Validation state
  const validationWarnings = ref<ValidationWarning[]>([])
  const _isValidatingInternal = ref(false)
  let _isValidatingFlag = false // Plain JS variable to prevent watcher loops
  let validationDebounceTimer: ReturnType<typeof setTimeout> | null = null

  // Computed wrapper to access validation state without triggering watcher
  const isValidating = computed(() => _isValidatingInternal.value)

  // Computed: group warnings by severity
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

  // Computed: highest severity level
  const highestSeverity = computed((): ValidationSeverity | null => {
    if (validationWarnings.value.length === 0) return null
    if ((groupedWarningsBySeverity.value.CRITICAL?.length ?? 0) > 0) return 'CRITICAL'
    if ((groupedWarningsBySeverity.value.WARNING?.length ?? 0) > 0) return 'WARNING'
    return 'INFO'
  })

  // Computed: Vuetify color for severity
  const highestSeverityColor = computed(() => {
    const severity = highestSeverity.value
    if (severity === 'CRITICAL') return 'error'
    if (severity === 'WARNING') return 'warning'
    return 'info'
  })

  // Computed: all used concept sets
  const usedConceptSets = computed(() => {
    return extractConceptSets(
      entryEvents.value,
      additionalCriteria.value,
      inclusionRules.value,
      exitCriteria.value,
      censoringCriteria.value
    )
  })

  /**
   * Validate the current cohort definition
   */
  async function validateCohort() {
    try {
      _isValidatingFlag = true
      _isValidatingInternal.value = true

      // Build cohort definition for validation
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
        inclusionQualifyingLimit: inclusionQualifyingLimit.value,
        conceptSets: usedConceptSets.value,
      }

      // Convert to Atlas format for validation
      const atlasExpression = convertInternalToAtlas(cohortDef)

      // Use placeholder name if empty
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

  /**
   * Debounced validation trigger
   */
  function triggerValidation() {
    // Skip if already validating
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

  /**
   * Cancel any pending validation
   */
  function cancelValidation() {
    if (validationDebounceTimer) {
      clearTimeout(validationDebounceTimer)
      validationDebounceTimer = null
    }
  }

  /**
   * Clear all validation warnings
   */
  function clearWarnings() {
    validationWarnings.value = []
  }

  // Watch for changes to cohort definition and trigger validation
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
      inclusionQualifyingLimit,
    ],
    () => {
      triggerValidation()
    },
    { deep: true }
  )

  // Cleanup on unmount
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
