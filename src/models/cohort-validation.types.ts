/**
 * Cohort Validation Types
 * Types for cohort definition validation warnings from checkV2 endpoint
 */

export type ValidationSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export type ValidationWarningType = 'DefaultWarning' | 'ConceptSetWarning'

export interface ValidationWarning {
  type: ValidationWarningType
  severity: ValidationSeverity
  conceptSetId?: number
  message: string
}

export interface ValidationResponse {
  warnings: ValidationWarning[]
}
