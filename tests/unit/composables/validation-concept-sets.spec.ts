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
 * The fix gives useCohortValidation a `definedConceptSets` option and sends the
 * union of what the cohort declares and what the criteria reference.
 *
 * Everything below runs the real composable and asserts on the expression that
 * actually reaches validateCohortDefinition. Only the HTTP boundary
 * (validateCohortDefinition, getConceptSetById) is mocked — the Atlas converter
 * is the real one, so `ConceptSets` here is the array the server would receive.
 * An earlier version of this file re-implemented the union locally and asserted
 * against its own copy, which passed whether or not the composable did the same
 * thing; do not reintroduce that.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref, computed, nextTick } from 'vue'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { convertAtlasToInternal } from '@/services/atlas-converter'
import { useCohortValidation, type CohortValidationOptions } from '@/composables/useCohortValidation'
import { validateCohortDefinition } from '@/services/cohort-definition.service'
import type {
  CohortDefinition,
  CohortEvent,
  ConceptSetReference,
  CriteriaGroup,
  ExitCriteria,
  InclusionRule,
  QualifyingLimit,
} from '@/models/cohort.types'

vi.mock('@/services/cohort-definition.service', () => ({
  validateCohortDefinition: vi.fn(),
}))

// Hydration is not what these cases are about: resolve every lookup to "no
// stored set" so the references travel to the converter exactly as declared.
vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn(() => Promise.resolve(null)),
}))

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

interface PostedExpression {
  ConceptSets?: Array<{ id: number; name: string }>
}

const CONTINUOUS_OBSERVATION: ExitCriteria = { strategy: 'CONTINUOUS_OBSERVATION' }

function baseOptions(overrides: Partial<CohortValidationOptions> = {}): CohortValidationOptions {
  return {
    cohortName: ref('Concept set payload'),
    cohortDescription: ref(''),
    cohortId: computed(() => null),
    entryEvents: ref<CohortEvent[]>([]),
    additionalCriteria: ref<CriteriaGroup | undefined>(undefined),
    inclusionRules: ref<InclusionRule[]>([]),
    exitCriteria: ref<ExitCriteria>({ ...CONTINUOUS_OBSERVATION }),
    censoringCriteria: ref<CohortEvent[]>([]),
    observationPeriod: ref({ priorDays: 0, postDays: 0 }),
    qualifyingLimit: ref<QualifyingLimit>('ALL'),
    inclusionQualifyingLimit: ref<QualifyingLimit>('ALL'),
    debounceDelay: 10,
    ...overrides,
  }
}

/** Run one debounced validation pass and return the expression that was POSTed. */
async function postedExpression(options: CohortValidationOptions): Promise<PostedExpression> {
  const { triggerValidation, cancelValidation } = useCohortValidation(options)

  cancelValidation()
  vi.mocked(validateCohortDefinition).mockClear()

  triggerValidation()
  await vi.runAllTimersAsync()
  await nextTick()

  const calls = vi.mocked(validateCohortDefinition).mock.calls
  expect(calls).toHaveLength(1)
  return calls[0][1] as PostedExpression
}

function entryEventUsing(conceptSet: ConceptSetReference): CohortEvent {
  return {
    id: `entry-${String(conceptSet.id)}`,
    criteriaType: 'ConditionOccurrence',
    conceptSet,
    attributes: [],
  }
}

function sentIds(expression: PostedExpression): number[] {
  return (expression.ConceptSets ?? []).map(set => set.id)
}

function sentNames(expression: PostedExpression): string[] {
  return (expression.ConceptSets ?? []).map(set => set.name)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(validateCohortDefinition).mockResolvedValue({
    success: true,
    data: { warnings: [] },
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('the ConceptSets useCohortValidation sends', () => {
  it('keeps a set the cohort declares but no criterion references', async () => {
    // The whole point of #200: the criteria reference this set through a shape
    // extractConceptSets cannot see (a *CS attribute field), so discovery finds
    // nothing and the declared set is the only thing standing between circe and
    // a dangling CodesetId.
    const declared: ConceptSetReference[] = [{ id: 7, name: 'Inpatient visit types' }]

    const expression = await postedExpression(
      baseOptions({ definedConceptSets: () => declared })
    )

    expect(sentIds(expression)).toEqual([7])
  })

  it('keeps a set only the criteria reference', async () => {
    const expression = await postedExpression(
      baseOptions({
        entryEvents: ref([entryEventUsing({ id: 3, name: 'Referenced only' })]),
        definedConceptSets: () => [],
      })
    )

    expect(sentIds(expression)).toEqual([3])
  })

  it('sends a set that is both declared and referenced exactly once', async () => {
    const shared: ConceptSetReference = { id: 4, name: 'Declared and referenced' }

    const expression = await postedExpression(
      baseOptions({
        entryEvents: ref([entryEventUsing({ ...shared })]),
        definedConceptSets: () => [shared],
      })
    )

    expect(sentIds(expression)).toEqual([4])
    expect(sentNames(expression)).toEqual(['Declared and referenced'])
  })

  it('drops a declared set whose id is not numeric', async () => {
    // A client-side UUID never becomes a CodesetId, so letting it through would
    // only make the converter invent an array-index id that collides with a
    // real set.
    const declared: ConceptSetReference[] = [
      { id: 'b4d1c8e2-uuid', name: 'Unsaved set' },
      { id: 5, name: 'Saved set' },
    ]

    const expression = await postedExpression(
      baseOptions({ definedConceptSets: () => declared })
    )

    expect(sentNames(expression)).toEqual(['Saved set'])
    expect(sentIds(expression)).toEqual([5])
  })

  it('falls back to discovery alone when definedConceptSets is not supplied', async () => {
    // The option is optional; a caller that never passes it must get exactly
    // the pre-#200 behaviour.
    const expression = await postedExpression(
      baseOptions({
        entryEvents: ref([entryEventUsing({ id: 3, name: 'Referenced only' })]),
      })
    )

    expect(sentIds(expression)).toEqual([3])
  })

  it('preserves the declared order, declared sets before discovered ones', async () => {
    const expression = await postedExpression(
      baseOptions({
        entryEvents: ref([entryEventUsing({ id: 9, name: 'Discovered' })]),
        definedConceptSets: () => [
          { id: 2, name: 'Declared second' },
          { id: 1, name: 'Declared first' },
        ],
      })
    )

    expect(sentIds(expression)).toEqual([2, 1, 9])
  })
})

/**
 * The invariant the #200 regression broke, pinned across every atlas-demo
 * cohort: whatever the composable ends up sending, no criterion may point at a
 * CodesetId the payload does not define. Asserting that rather than a set count
 * keeps these independent of which reference paths extractConceptSets happens
 * to understand.
 */
describe('atlas-demo cohorts round-tripped through the composable', () => {
  function optionsForFixture(expression: unknown): CohortValidationOptions {
    const internal = convertAtlasToInternal(expression as never) as Partial<CohortDefinition>

    return baseOptions({
      entryEvents: ref(internal.entryEvents ?? []),
      additionalCriteria: ref(internal.additionalCriteria),
      inclusionRules: ref(internal.inclusionRules ?? []),
      exitCriteria: ref(internal.exitCriteria ?? { ...CONTINUOUS_OBSERVATION }),
      censoringCriteria: ref(internal.censoringCriteria ?? []),
      censorWindow: ref(internal.censorWindow),
      collapseSettings: ref(internal.collapseSettings),
      observationPeriod: ref(internal.observationPeriod ?? { priorDays: 0, postDays: 0 }),
      qualifyingLimit: ref(internal.qualifyingLimit ?? 'ALL'),
      primaryCriteriaLimit: ref(internal.primaryCriteriaLimit),
      inclusionQualifyingLimit: ref(internal.inclusionQualifyingLimit ?? 'ALL'),
      definedConceptSets: () => internal.conceptSets ?? [],
    })
  }

  it.each(fixtures)('%s: every referenced codeset is defined in the payload', async (_name, expression) => {
    const payload = await postedExpression(optionsForFixture(expression))
    const defined = new Set(sentIds(payload))

    const dangling = [...new Set(referencedCodesetIds(payload))].filter(id => !defined.has(id))

    expect(dangling).toEqual([])
  })

  it.each(fixtures)('%s: keeps every concept set the cohort declares', async (_name, expression) => {
    const declared = ((expression as { ConceptSets?: unknown[] }).ConceptSets ?? []).length
    const payload = await postedExpression(optionsForFixture(expression))

    expect(sentIds(payload)).toHaveLength(declared)
  })
})
