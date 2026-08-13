import type { CohortExpression, EndStrategy } from '@/components/cohort-editor/circe.types'
import type { ValidationSeverity, ValidationWarning } from '@/models/cohort-validation.types'

// checkV2 already reports both of these through circe's Checker, so the severities
// here mirror what the server assigns: ExitCriteriaCheck inherits BaseCheck's
// CRITICAL, while ExitCriteriaDaysOffsetCheck overrides it down to WARNING. Running
// them locally only removes the round-trip latency; it must not change the verdict.
const MISSING_DRUG_CODESET =
  'Continuous Exposure Persistence exit strategy is missing its drug concept set (DrugCodesetId). Cohort SQL generation will fail until one is selected.'

const MISSING_DATE_OFFSET =
  'Fixed Duration Persistence exit strategy is missing its number of days offset (Offset). Cohort SQL generation will fail until one is entered.'

function warning(severity: ValidationSeverity, message: string): ValidationWarning {
  return { type: 'DefaultWarning', severity, message }
}

export interface ExitCriteriaValidationReturn {
  validateEndStrategy: (endStrategy: EndStrategy | null | undefined) => ValidationWarning[]
  validateExpression: (expression: CohortExpression | null | undefined) => ValidationWarning[]
}

export function useExitCriteriaValidation(): ExitCriteriaValidationReturn {
  function validateEndStrategy(endStrategy: EndStrategy | null | undefined): ValidationWarning[] {
    if (!endStrategy) return []

    if ('CustomEra' in endStrategy) {
      const customEra = endStrategy.CustomEra
      return customEra?.DrugCodesetId == null ? [warning('CRITICAL', MISSING_DRUG_CODESET)] : []
    }

    if ('DateOffset' in endStrategy) {
      const dateOffset = endStrategy.DateOffset
      return dateOffset?.Offset == null ? [warning('WARNING', MISSING_DATE_OFFSET)] : []
    }

    return []
  }

  function validateExpression(
    expression: CohortExpression | null | undefined
  ): ValidationWarning[] {
    return validateEndStrategy(expression?.EndStrategy)
  }

  return { validateEndStrategy, validateExpression }
}
