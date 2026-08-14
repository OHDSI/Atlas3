/**
 * Issue #200: after importing a cohort, validation reported "It's not specified
 * what type of records to look for in <domain> at initial event" for criteria
 * that plainly had a concept set.
 *
 * The cohort was fine. The payload sent to checkV2 was not: validateCohort
 * rebuilt the `ConceptSets` array from extractConceptSets, which only sees a set
 * referenced through `event.conceptSet` or an attribute of type 'conceptSet'.
 * References carried on `*CS` attribute fields (VisitTypeCS, DeathTypeCS,
 * ProviderSpecialtyCS, ...) do not survive import in that shape, so those sets
 * were dropped from the payload while the criteria kept their CodesetId. circe
 * then saw a criterion pointing at a codeset nothing defined.
 *
 * The invariant these cases pin is the one that was broken: every CodesetId in
 * the payload must resolve to a set the payload defines. Asserting that rather
 * than a set count is what makes this independent of which reference paths
 * extractConceptSets happens to understand.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import { extractConceptSets } from '@/composables/useCohortValidation'
import type { ConceptSetReference } from '@/models/cohort.types'

const FIXTURE_DIR = resolve(__dirname, '../../e2e/fixtures/atlas-demo')

const fixtures = readdirSync(FIXTURE_DIR)
  .filter(name => name.startsWith('cohort-') && name.endsWith('.json'))
  .map(name => {
    const raw = JSON.parse(readFileSync(resolve(FIXTURE_DIR, name), 'utf-8'))
    return [name, raw.expression ?? raw] as const
  })

/** Every `"CodesetId": <n>` and `"DrugCodesetId": <n>` anywhere in the payload. */
function referencedCodesetIds(payload: unknown): number[] {
  const found = [...JSON.stringify(payload).matchAll(/"(?:Drug)?CodesetId":\s*(\d+)/g)]
  return found.map(match => Number(match[1]))
}

/**
 * Mirrors what useCohortValidation.validateCohort sends: the cohort converted to
 * Atlas format, with the ConceptSets array taken from the union of what the
 * cohort declares and what the criteria reference.
 */
function validationPayload(expression: unknown, useDeclaredSets: boolean) {
  const internal = convertAtlasToInternal(expression as never) as unknown as Record<string, never>
  const anyInternal = internal as unknown as {
    entryEvents: never
    additionalCriteria: never
    inclusionRules: never
    exitCriteria?: never
    censoringCriteria?: never
    conceptSets?: ConceptSetReference[]
  }

  const used = extractConceptSets(
    anyInternal.entryEvents,
    anyInternal.additionalCriteria,
    anyInternal.inclusionRules,
    anyInternal.exitCriteria ?? ({ strategy: 'CONTINUOUS_OBSERVATION' } as never),
    anyInternal.censoringCriteria ?? ([] as never),
  )

  const byId = new Map<number | string, ConceptSetReference>()
  if (useDeclaredSets) {
    for (const set of anyInternal.conceptSets ?? []) {
      if (typeof set.id === 'number') byId.set(set.id, set)
    }
  }
  for (const set of used) {
    if (!byId.has(set.id)) byId.set(set.id, set)
  }

  return convertInternalToAtlas({ ...internal, conceptSets: [...byId.values()] } as never) as unknown
}

describe('the expression sent for validation', () => {
  it.each(fixtures)('%s: every referenced codeset is defined in the payload', (_name, expression) => {
    const payload = validationPayload(expression, true)
    const defined = new Set(
      ((payload as { ConceptSets?: Array<{ id?: number }> }).ConceptSets ?? []).map(set => set.id),
    )

    const dangling = [...new Set(referencedCodesetIds(payload))].filter(id => !defined.has(id))

    expect(dangling).toEqual([])
  })

  it.each(fixtures)('%s: keeps every concept set the cohort declares', (_name, expression) => {
    const declared = ((expression as { ConceptSets?: unknown[] }).ConceptSets ?? []).length
    const payload = validationPayload(expression, true)
    const sent = ((payload as { ConceptSets?: unknown[] }).ConceptSets ?? []).length

    expect(sent).toBe(declared)
  })
})
