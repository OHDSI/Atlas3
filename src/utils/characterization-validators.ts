/**
 * Characterization Validators
 *
 * Pure synchronous validation rules that mirror Atlas 2.15's
 * characterization-view-edit checks (name required, strata names empty /
 * duplicated, criteria parseable). Returns a flat list of severity-tagged
 * messages — the Validation tab groups them for display and the Save
 * button blocks when at least one error is present.
 */
import type {
  CharacterizationDefinition,
  Stratum,
} from '@/models/characterization.types'

export type ValidationLevel = 'error' | 'warning' | 'info'

export interface ValidationMessage {
  level: ValidationLevel
  /** Field path the message refers to, e.g. `name`, `cohorts`, `stratas[1].criteria`. */
  field: string
  /** Human-readable message. English; the Validation tab maps known rule ids to i18n. */
  message: string
  /** Optional rule id for i18n key lookup. */
  ruleId?: string
  /** Optional interpolation params for the i18n key. */
  params?: Record<string, string | number>
}

const TOO_MANY_FEATURE_ANALYSES_THRESHOLD = 50

/**
 * Try to parse a stratum's `criteria` field. Returns true if the criteria
 * are present and either an object (already parsed) or a JSON-parseable
 * string.
 */
function isStratumCriteriaValid(stratum: Stratum): boolean {
  const { criteria } = stratum
  if (criteria == null) return false
  if (typeof criteria === 'string') {
    if (criteria.trim().length === 0) return false
    try {
      JSON.parse(criteria)
      return true
    } catch {
      return false
    }
  }
  return typeof criteria === 'object'
}

/**
 * Validate a CharacterizationDefinition.
 *
 * Rules:
 * - error: `name` empty / whitespace-only
 * - error: `cohorts.length === 0`
 * - error: `featureAnalyses.length === 0`
 * - warning: stratum has no name
 * - warning: two strata share the same name
 * - error: stratum criteria is null/undefined or unparseable JSON string
 * - warning: `strataOnly === true` && `stratas.length === 0`
 * - info: `featureAnalyses.length > 50` (large designs may be slow)
 */
export function validateCharacterization(
  def: CharacterizationDefinition
): ValidationMessage[] {
  const messages: ValidationMessage[] = []

  if (!def.name || def.name.trim().length === 0) {
    messages.push({
      level: 'error',
      field: 'name',
      ruleId: 'nameRequired',
      message: 'Name is required.',
    })
  }

  if (!def.cohorts || def.cohorts.length === 0) {
    messages.push({
      level: 'error',
      field: 'cohorts',
      ruleId: 'cohortsRequired',
      message: 'At least one cohort must be linked.',
    })
  }

  if (!def.featureAnalyses || def.featureAnalyses.length === 0) {
    messages.push({
      level: 'error',
      field: 'featureAnalyses',
      ruleId: 'featureAnalysesRequired',
      message: 'At least one feature analysis must be linked.',
    })
  } else if (def.featureAnalyses.length > TOO_MANY_FEATURE_ANALYSES_THRESHOLD) {
    messages.push({
      level: 'info',
      field: 'featureAnalyses',
      ruleId: 'tooManyFeatureAnalyses',
      message: `${def.featureAnalyses.length} feature analyses may slow generation.`,
      params: { count: def.featureAnalyses.length },
    })
  }

  const strata = def.stratas ?? []

  strata.forEach((stratum, index) => {
    if (!stratum.name || stratum.name.trim().length === 0) {
      messages.push({
        level: 'warning',
        field: `stratas[${index}].name`,
        ruleId: 'strataNameMissing',
        message: `Stratum ${index + 1} has no name.`,
        params: { n: index + 1 },
      })
    }
    if (!isStratumCriteriaValid(stratum)) {
      const display = stratum.name?.trim().length ? stratum.name : `#${index + 1}`
      messages.push({
        level: 'error',
        field: `stratas[${index}].criteria`,
        ruleId: 'strataCriteriaInvalid',
        message: `Stratum '${display}' has invalid criteria JSON.`,
        params: { name: display },
      })
    }
  })

  // Duplicate strata names — case-sensitive trimmed compare; flag once per name.
  const nameCounts = new Map<string, number>()
  strata.forEach((s) => {
    const trimmed = (s.name ?? '').trim()
    if (trimmed.length === 0) return
    nameCounts.set(trimmed, (nameCounts.get(trimmed) ?? 0) + 1)
  })
  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      messages.push({
        level: 'warning',
        field: 'stratas',
        ruleId: 'strataNameDuplicate',
        message: `Two or more strata share the name '${name}'.`,
        params: { name },
      })
    }
  }

  if (def.strataOnly === true && strata.length === 0) {
    messages.push({
      level: 'warning',
      field: 'strataOnly',
      ruleId: 'strataOnlyButNoStrata',
      message: 'Strata-only is enabled but no strata are defined.',
    })
  }

  return messages
}

/** Convenience: count messages per level. */
export function countByLevel(
  messages: ValidationMessage[]
): Record<ValidationLevel, number> {
  return messages.reduce<Record<ValidationLevel, number>>(
    (acc, m) => {
      acc[m.level] = (acc[m.level] ?? 0) + 1
      return acc
    },
    { error: 0, warning: 0, info: 0 }
  )
}
