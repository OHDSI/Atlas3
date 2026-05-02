/**
 * useEventPersistence Composable
 * Manages state for Event Persistence strategy configuration
 */

import { reactive, computed } from 'vue'
import type { ExitCriteria, ExitStrategy, ConceptSetReference } from '@/models/cohort.types'
import type { EventPersistenceState } from '@/models/validation.types'

/**
 * Default state for each persistence strategy
 */
const DEFAULT_STATE: EventPersistenceState = {
  strategy: 'CONTINUOUS_OBSERVATION',
  fixedDuration: {
    dateField: 'START_DATE',
    offset: 0,
  },
  drugExposure: {
    conceptSetId: null,
    persistenceWindow: 30,
    surveillanceWindow: 7,
  },
  validationErrors: new Map(),
}

/**
 * useEventPersistence composable
 * Provides state management and conversion logic for event persistence strategies
 */
export function useEventPersistence(initialCriteria?: ExitCriteria) {
  // Initialize state from existing ExitCriteria or use defaults
  const state = reactive<EventPersistenceState>(initializeState(initialCriteria))

  /**
   * Initialize state from ExitCriteria
   */
  function initializeState(criteria?: ExitCriteria): EventPersistenceState {
    if (!criteria) {
      return {
        ...DEFAULT_STATE,
        // Create new Map instance to avoid sharing across instances
        validationErrors: new Map(),
      }
    }

    const newState = {
      ...DEFAULT_STATE,
      // Create new Map instance to avoid sharing across instances
      validationErrors: new Map(),
    }
    newState.strategy = criteria.strategy

    if (criteria.strategy === 'FIXED_DURATION') {
      newState.fixedDuration = {
        dateField: criteria.dateField || 'START_DATE',
        offset: criteria.offset || 0,
      }
    } else if (criteria.strategy === 'CONTINUOUS_DRUG') {
      newState.drugExposure = {
        conceptSetId: criteria.conceptSet?.id?.toString() || null,
        persistenceWindow: criteria.persistenceWindow || 30,
        surveillanceWindow: criteria.surveillanceWindow || 7,
      }
    }

    return newState
  }

  /**
   * Switch to a different persistence strategy
   */
  function switchStrategy(newStrategy: ExitStrategy) {
    state.strategy = newStrategy
    state.validationErrors.clear()

    // Apply default values for new strategy
    if (newStrategy === 'FIXED_DURATION') {
      state.fixedDuration = {
        dateField: 'START_DATE',
        offset: 0,
      }
    } else if (newStrategy === 'CONTINUOUS_DRUG') {
      state.drugExposure = {
        conceptSetId: null,
        persistenceWindow: 30,
        surveillanceWindow: 7,
      }
    }
  }

  /**
   * Convert state to ExitCriteria object
   */
  function toExitCriteria(conceptSets: ConceptSetReference[]): ExitCriteria {
    const baseCriteria: ExitCriteria = {
      strategy: state.strategy,
    }

    if (state.strategy === 'FIXED_DURATION') {
      baseCriteria.dateField = state.fixedDuration.dateField
      baseCriteria.offset = state.fixedDuration.offset
    } else if (state.strategy === 'CONTINUOUS_DRUG') {
      if (state.drugExposure.conceptSetId) {
        const conceptSet = conceptSets.find(
          cs => cs.id.toString() === state.drugExposure.conceptSetId
        )
        if (conceptSet) {
          baseCriteria.conceptSet = conceptSet
          baseCriteria.persistenceWindow = state.drugExposure.persistenceWindow
          baseCriteria.surveillanceWindow = state.drugExposure.surveillanceWindow
        }
      }
    }

    return baseCriteria
  }

  /**
   * Add validation error for a field
   */
  function addValidationError(field: string, message: string) {
    state.validationErrors.set(field, message)
  }

  /**
   * Clear validation error for a field
   */
  function clearValidationError(field: string) {
    state.validationErrors.delete(field)
  }

  /**
   * Clear all validation errors
   */
  function clearAllValidationErrors() {
    state.validationErrors.clear()
  }

  /**
   * Check if state has validation errors
   */
  const hasErrors = computed(() => state.validationErrors.size > 0)

  /**
   * Get validation error for a specific field
   */
  function getError(field: string): string | undefined {
    return state.validationErrors.get(field)
  }

  return {
    state,
    switchStrategy,
    toExitCriteria,
    addValidationError,
    clearValidationError,
    clearAllValidationErrors,
    hasErrors,
    getError,
  }
}
