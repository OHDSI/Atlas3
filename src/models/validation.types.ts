/**
 * Validation Types
 * Types for validation errors and results
 */

import type { ExitStrategy } from './cohort.types'

/**
 * ValidationError - Standardized error representation for validation feedback
 */
export interface ValidationError {
  field: string // Dot-notation path to field (e.g., 'exitCriteria.offset')
  message: string // Human-readable error message
  severity: 'error' | 'warning' | 'info' // Error level
}

/**
 * ValidationResult - Result of validation operation
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

/**
 * EventPersistenceState - UI state management for event persistence configuration
 */
export interface EventPersistenceState {
  strategy: ExitStrategy
  fixedDuration: {
    dateField: 'START_DATE' | 'END_DATE'
    offset: number
  }
  drugExposure: {
    conceptSetId: string | null
    persistenceWindow: number
    surveillanceWindow: number
  }
  validationErrors: Map<string, string>
}
