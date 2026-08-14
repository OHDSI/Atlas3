import type { CohortDefinition } from '@/models/cohort.types'

/**
 * A cohort definition as it arrives from WebAPI, before the expression is
 * parsed and schema-validated by normalizeRawCohortDefinition.
 *
 * WebAPI's DTO field is a String, so `expression` is normally serialised JSON.
 * It is typed as `string | object` because it does not always arrive that way:
 * the version-preview path and the e2e mocks hand over an object that has
 * already been parsed. Narrowing this to `string` made the object case a 422
 * and loaded the editor empty.
 */
export type RawCohortDefinition = Omit<CohortDefinition, 'expression'> & {
  expression: string | object
}
