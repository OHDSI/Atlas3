/**
 * normalize.ts
 *
 * Fills in the fields circe-be requires but the editor leaves unset, on the way
 * out of the application — on save, and on export.
 *
 * Why at the boundary rather than on load: the editor deliberately keeps the
 * document sparse (Document_Editor_HOWTO principle 4). Arrays and objects are
 * created lazily, only when the user adds something, so opening a cohort and
 * closing it again leaves its JSON byte-for-byte unchanged. Writing defaults on
 * load would break that — every cohort would come back dirty from being looked
 * at, and a save would add fields the stored definition never had.
 *
 * The cost of staying sparse is that a document can reach the server missing
 * something circe-be needs:
 *
 * - A `CriteriaGroup` with no `Type`. Atlas 2.15 always initialises
 *   `Type || 'ALL'`, and circe-be has no default of its own, so a group created
 *   by one of the lazy `ensureObjectField(..., () => ({}))` sites serialises
 *   without one.
 * - An `AT_LEAST` / `AT_MOST` group with no `Count`, which reaches generation as
 *   `HAVING COUNT(index_id) >= null`.
 * - A numeric or date range carrying a `Value` but no `Op`. The editors display
 *   a default operator when `Op` is unset, so the user sees a comparison the
 *   saved criterion does not actually contain.
 *
 * Everything here is therefore a write the editor would have made if the user
 * had touched the field. Nothing invents a filter that was not already there:
 * a range with no `Value` and no `Extent` is not a filter, and is left alone.
 */
import {
  CohortExpressionSchema,
  CriteriaGroupSchema,
  DateRangeSchema,
  NumericRangeSchema,
  type CohortExpression,
  type CriteriaGroup,
  type DateRange,
  type NumericRange,
} from '@/models/circe-types'
import { walkSchema } from './schema-walk'

/** Group match type circe-be assumes when none is given (mirrors Atlas 2.15). */
export const DEFAULT_GROUP_TYPE = 'ALL' as const

/** Occurrence count an AT_LEAST / AT_MOST group starts at (mirrors Atlas 2.15). */
export const DEFAULT_GROUP_COUNT = 0

/**
 * Comparison the range editors fall back to for display when `Op` is unset.
 * Exported so the editors and this normalizer cannot drift apart: whatever the
 * user is shown is what gets persisted.
 */
export const DEFAULT_RANGE_OP = 'gte' as const

/**
 * Returns a deep copy of `expression` with the fields circe-be requires filled
 * in. The input is left untouched, so this is safe to call on the live reactive
 * document.
 */
export function normalizeForCirce(expression: CohortExpression): CohortExpression {
  const normalized = JSON.parse(JSON.stringify(expression)) as CohortExpression

  walkSchema(CohortExpressionSchema, normalized, {
    value(schema, data) {
      if (!data || typeof data !== 'object') return

      if (schema === CriteriaGroupSchema) {
        normalizeCriteriaGroup(data as CriteriaGroup)
      } else if (schema === NumericRangeSchema || schema === DateRangeSchema) {
        normalizeRange(data as NumericRange | DateRange)
      }
    },
  })

  return normalized
}

function normalizeCriteriaGroup(group: CriteriaGroup): void {
  if (group.Type === null || group.Type === undefined) {
    group.Type = DEFAULT_GROUP_TYPE
  }

  const countsOccurrences = group.Type === 'AT_LEAST' || group.Type === 'AT_MOST'
  if (countsOccurrences && (group.Count === null || group.Count === undefined)) {
    group.Count = DEFAULT_GROUP_COUNT
  }
}

function normalizeRange(range: NumericRange | DateRange): void {
  // An operator only means something alongside a bound. A range with neither
  // `Value` nor `Extent` is an untouched attribute, not a filter missing its
  // comparison, and giving it an operator would write a constraint the user
  // never expressed.
  const hasBound =
    (range.Value !== null && range.Value !== undefined) ||
    (range.Extent !== null && range.Extent !== undefined)

  if (hasBound && (range.Op === null || range.Op === undefined)) {
    range.Op = DEFAULT_RANGE_OP
  }
}
