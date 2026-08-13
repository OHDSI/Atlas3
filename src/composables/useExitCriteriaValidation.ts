import type { CohortExpression, EndStrategy } from '@/components/cohort-editor/circe.types'
import type { ValidationWarning } from '@/models/cohort-validation.types'

// These gaps are rejected by the WebAPI SQL generator, not by checkV2, so a cohort
// with one saves cleanly and only fails later at generation time.
const EXIT_CRITERIA_SEVERITY = 'CRITICAL' as const

const MISSING_DRUG_CODESET =
  'Continuous Exposure Persistence exit strategy is missing its drug concept set (DrugCodesetId). Cohort SQL generation will fail until one is selected.'

const MISSING_DATE_OFFSET =
  'Fixed Duration Persistence exit strategy is missing its number of days offset (Offset). Cohort SQL generation will fail until one is entered.'

function warning(message: string): ValidationWarning {
  return { type: 'DefaultWarning', severity: EXIT_CRITERIA_SEVERITY, message }
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
      return customEra?.DrugCodesetId == null ? [warning(MISSING_DRUG_CODESET)] : []
    }

    if ('DateOffset' in endStrategy) {
      const dateOffset = endStrategy.DateOffset
      return dateOffset?.Offset == null ? [warning(MISSING_DATE_OFFSET)] : []
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
