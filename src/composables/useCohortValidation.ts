import { ref, computed, watch, type Ref, type ComputedRef, onUnmounted } from 'vue'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ValidationWarning, ValidationSeverity } from '@/models/cohort-validation.types'
import { validateCohortDefinition } from '@/services/cohort-definition.service'
import { logger } from '@/utils/logger'
import type { CohortExpression, ConceptSet } from '@/components/cohort-editor/circe.types'
import { findUsedConceptSetIds } from '@/components/cohort-editor/concept-set-usage'

export interface CohortValidationOptions {
  /** Reactive CohortExpression object (pass the result of reactive<CohortExpression>()) */
  expression: CohortExpression
  cohortName: Ref<string>
  cohortDescription: Ref<string>
  cohortId: ComputedRef<number | null>
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

export function useCohortValidation(options: CohortValidationOptions): CohortValidationReturn {
  const { cohortName, cohortDescription, debounceDelay = 2000 } = options

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
      if (severityGroup) severityGroup.push(warning)
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

  const usedConceptSets = computed<ConceptSetReference[]>(() => {
    const usedIds = findUsedConceptSetIds(options.expression)
    return (options.expression.ConceptSets ?? [] as ConceptSet[])
      .filter(cs => cs.id != null && usedIds.has(cs.id))
      .map(cs => ({ id: cs.id!, name: cs.name ?? '' }))
  })

  async function validateCohort() {
    try {
      _isValidatingFlag = true
      _isValidatingInternal.value = true
      const nameForValidation = cohortName.value || 'Untitled Cohort'
      const result = await validateCohortDefinition(nameForValidation, options.expression)
      if (result.success) {
        validationWarnings.value = result.data.warnings ?? []
      } else {
        validationWarnings.value = []
      }
    } catch (error) {
      logger.error('CohortValidation', 'Failed to validate cohort', error)
      validationWarnings.value = []
    } finally {
      _isValidatingFlag = false
      _isValidatingInternal.value = false
    }
  }

  function triggerValidation() {
    if (_isValidatingFlag) return
    if (validationDebounceTimer) clearTimeout(validationDebounceTimer)
    validationDebounceTimer = setTimeout(() => { validateCohort() }, debounceDelay)
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
    [() => options.expression, cohortName, cohortDescription],
    () => { triggerValidation() },
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
