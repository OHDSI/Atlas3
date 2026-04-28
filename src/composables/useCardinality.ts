import { useI18n } from './useI18n'
import type { Cardinality, CardinalityType, CountingMethod } from '@/models/event.types'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function useCardinality() {
  const { tv } = useI18n()
  /**
   * Validate cardinality constraints
   * CRITICAL: Use ?? operator for zero-count preservation
   */
  function validateCardinality(cardinality: Cardinality): ValidationResult {
    const errors: string[] = []

    // Validate count is non-negative
    if (cardinality.count < 0) {
      errors.push('Count must be >= 0')
    }

    // AT_LEAST requires count >= 1
    if (cardinality.type === 'AT_LEAST' && cardinality.count < 1) {
      errors.push('AT_LEAST requires count >= 1')
    }

    // EXACTLY and AT_MOST allow count >= 0 (including 0)
    // No additional validation needed

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Format cardinality for display
   * CRITICAL: Use ?? operator to preserve zero counts
   */
  function formatCardinalityDisplay(cardinality: Cardinality): string {
    // Use ?? operator to preserve zero (NOT || which converts 0 to 1)
    const count = cardinality.count ?? 1
    const occurrenceWord = count === 1 ? 'occurrence' : 'occurrences'

    let typeLabel = ''
    switch (cardinality.type) {
      case 'AT_LEAST':
        typeLabel = 'At Least'
        break
      case 'EXACTLY':
        typeLabel = 'Exactly'
        break
      case 'AT_MOST':
        typeLabel = 'At Most'
        break
    }

    let display = `${typeLabel} ${count} ${occurrenceWord}`

    // Add counting method if not ALL
    if (cardinality.countingMethod !== 'ALL') {
      const methodLabel = formatCountingMethod(cardinality.countingMethod)
      display += ` (${methodLabel})`
    }

    return display
  }

  /**
   * Format counting method for display
   */
  function formatCountingMethod(method: CountingMethod): string {
    switch (method) {
      case 'ALL':
        return 'all occurrences'
      case 'DISTINCT_CONCEPT':
        return 'distinct concepts'
      case 'DISTINCT_START_DATE':
        return 'distinct start dates'
      case 'DISTINCT_VISIT':
        return 'distinct visits'
      default:
        return 'all occurrences'
    }
  }

  /**
   * Provide default cardinality values
   */
  function defaultCardinality(): Cardinality {
    return {
      type: 'AT_LEAST',
      count: 1,
      countingMethod: 'ALL',
    }
  }

  /**
   * Get cardinality type options for dropdown
   */
  function getCardinalityTypeOptions(): Array<{ value: CardinalityType; label: string }> {
    return [
      { value: 'AT_LEAST', label: tv('options.atLeast') },
      { value: 'EXACTLY', label: tv('options.exactly') },
      { value: 'AT_MOST', label: tv('options.atMost') },
    ]
  }

  /**
   * Get counting method options for dropdown
   */
  function getCountingMethodOptions(): Array<{ value: CountingMethod; label: string }> {
    return [
      { value: 'ALL', label: tv('options.all') },
      { value: 'DISTINCT_CONCEPT', label: tv('cohortDefinitions.designTab.countingOptions.distinctConcept') },
      { value: 'DISTINCT_START_DATE', label: tv('cohortDefinitions.designTab.countingOptions.distinctDate') },
      { value: 'DISTINCT_VISIT', label: tv('cohortDefinitions.designTab.countingOptions.distinctVisit') },
    ]
  }

  return {
    validateCardinality,
    formatCardinalityDisplay,
    formatCountingMethod,
    defaultCardinality,
    getCardinalityTypeOptions,
    getCountingMethodOptions,
  }
}
