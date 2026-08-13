// extractConceptSets was removed in the circe-types refactor. The equivalent
// functionality is now findUsedConceptSetIds (walks the CohortExpression graph
// directly rather than transforming from an internal form).
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { findUsedConceptSetIds, unassignConceptSetId } from '@/components/cohort-editor/concept-set-usage'
import {
  CohortExpressionSchema,
  ConditionOccurrenceSchema,
  CriteriaSchema,
  type CohortExpression,
} from '@/components/cohort-editor/circe.types'
import { synthesise } from '../../helpers/circe-schema-walk'

const sorted = (ids: Iterable<number>): number[] => [...ids].sort((a, b) => a - b)

describe('findUsedConceptSetIds', () => {
  it('returns both IDs when distinct concept sets share the same name (different ids)', () => {
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 1 } }],
      },
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: 2 } } }],
          },
        },
      ],
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([1, 2])
  })

  it('deduplicates the same concept set referenced from multiple places (same id)', () => {
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 5 } }],
      },
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            CriteriaList: [{ Criteria: { ConditionOccurrence: { CodesetId: 5 } } }],
          },
        },
      ],
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([5])
  })

  it('descends into a criteria group nested inside a criteria group', () => {
    const expression: CohortExpression = {
      AdditionalCriteria: {
        Type: 'ALL',
        Groups: [
          {
            Type: 'ANY',
            Groups: [
              {
                Type: 'AT_LEAST',
                Count: 1,
                CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 11 } } }],
              },
            ],
          },
        ],
      },
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([11])
  })

  it('descends into criteria correlated to another criterion', () => {
    const expression: CohortExpression = {
      PrimaryCriteria: {
        CriteriaList: [
          {
            ConditionOccurrence: {
              CodesetId: 1,
              CorrelatedCriteria: {
                Type: 'ALL',
                CriteriaList: [
                  {
                    Criteria: {
                      DrugExposure: {
                        CodesetId: 2,
                        DrugSourceConcept: 3,
                        RouteConceptCS: { CodesetId: 4, IsExclusion: true },
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
      },
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([1, 2, 3, 4])
  })

  it('finds concept sets referenced only from a demographic criteria list', () => {
    const expression: CohortExpression = {
      InclusionRules: [
        {
          name: 'Rule 1',
          expression: {
            Type: 'ALL',
            DemographicCriteriaList: [
              { GenderCS: { CodesetId: 7 } },
              { RaceCS: { CodesetId: 8, IsExclusion: true }, EthnicityCS: { CodesetId: 9 } },
            ],
          },
        },
      ],
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([7, 8, 9])
  })

  it('finds a concept set referenced only from the custom-era end strategy', () => {
    const expression: CohortExpression = {
      EndStrategy: { CustomEra: { DrugCodesetId: 42, GapDays: 30, Offset: 7 } },
    }

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([42])
  })

  it('ignores numbers on the date-offset end strategy', () => {
    const expression: CohortExpression = {
      EndStrategy: { DateOffset: { DateField: 'EndDate', Offset: 42 } },
    }

    expect(findUsedConceptSetIds(expression).size).toBe(0)
  })
})

describe('unassignConceptSetId', () => {
  const nestedExpression = (): CohortExpression => ({
    PrimaryCriteria: {
      CriteriaList: [
        {
          ConditionOccurrence: {
            CodesetId: 5,
            CorrelatedCriteria: {
              Type: 'ALL',
              Groups: [
                {
                  Type: 'ANY',
                  CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 5, DrugSourceConcept: 6 } } }],
                  DemographicCriteriaList: [{ GenderCS: { CodesetId: 5, IsExclusion: true } }],
                },
              ],
            },
          },
        },
      ],
    },
    EndStrategy: { CustomEra: { DrugCodesetId: 5 } },
  })

  it('clears the id everywhere it is nested, leaving other references intact', () => {
    const expression = nestedExpression()

    unassignConceptSetId(expression, 5)

    expect(sorted(findUsedConceptSetIds(expression))).toEqual([6])
  })

  it('keeps the rest of a concept set selection when clearing its id', () => {
    const expression = nestedExpression()

    unassignConceptSetId(expression, 5)

    const group = expression.PrimaryCriteria?.CriteriaList?.[0] as {
      ConditionOccurrence: { CorrelatedCriteria: { Groups: [{ DemographicCriteriaList: [{ GenderCS: unknown }] }] } }
    }
    expect(group.ConditionOccurrence.CorrelatedCriteria.Groups[0].DemographicCriteriaList[0].GenderCS)
      .toEqual({ CodesetId: undefined, IsExclusion: true })
  })
})

/**
 * The walker recognises a reference field by reference-equality against the shared
 * `ConceptSetIdSchema` / `ConceptSetSelectionSchema` instances, so a field declared with
 * a lookalike `z.number()` would be skipped in silence. These tests re-derive the set of
 * reference fields from an independent rule - the field's name - and require the walker
 * to have found every one of them.
 */
const VARIANTS = CriteriaSchema.options.length

interface Corpus {
  expressions: CohortExpression[]
  /** Every generated number is unique, so an id the walker reports identifies where it sat. */
  pathOf: Map<number, string>
}

function buildCorpus(): Corpus {
  const pathOf = new Map<number, string>()
  let nextId = 0
  const expressions = Array.from({ length: VARIANTS }, (_unused, variant) =>
    synthesise(CohortExpressionSchema, {
      variant,
      scalars: {
        number: path => {
          const id = ++nextId
          pathOf.set(id, path)
          return id
        },
      },
    }) as CohortExpression,
  )
  return { expressions, pathOf }
}

const leafName = (path: string): string => path.split('.').pop()!.replace(/\[\]$/, '')

const namesAReference = (path: string): boolean => /CodesetId$/.test(leafName(path))

interface Audit {
  /** Paths named `*CodesetId` that the walker did not report. */
  missing: string[]
  /** Paths the walker did report whose name does not end in `CodesetId`. */
  extra: string[]
  namedPaths: Set<string>
}

function audit(corpus: Corpus): Audit {
  const found = new Set<number>()
  for (const expression of corpus.expressions) {
    for (const id of findUsedConceptSetIds(expression)) found.add(id)
  }

  const missing = new Set<string>()
  const extra = new Set<string>()
  const namedPaths = new Set<string>()
  for (const [id, path] of corpus.pathOf) {
    const named = namesAReference(path)
    if (named) namedPaths.add(path)
    if (named && !found.has(id)) missing.add(path)
    if (!named && found.has(id)) extra.add(path)
  }

  return { missing: [...missing].sort(), extra: [...extra].sort(), namedPaths }
}

const CORPUS_AUDIT = audit(buildCorpus())

describe('concept-set reference discovery over the whole schema', () => {
  it('finds every field the schema names *CodesetId', () => {
    expect(
      CORPUS_AUDIT.missing,
      `reference fields the walker did not discover:\n    ${CORPUS_AUDIT.missing.join('\n    ')}`,
    ).toEqual([])
    expect(CORPUS_AUDIT.namedPaths.size).toBe(1363)
  })

  it('pins the reference fields whose names do not end in CodesetId', () => {
    const names = [...new Set(CORPUS_AUDIT.extra.map(leafName))].sort()

    expect(names).toEqual([
      'ConditionSourceConcept',
      'DeathSourceConcept',
      'DeviceSourceConcept',
      'DrugSourceConcept',
      'MeasurementSourceConcept',
      'ObservationSourceConcept',
      'PayerConcept',
      'PayerSourceConcept',
      'PlaceOfServiceLocation',
      'PlanConcept',
      'PlanSourceConcept',
      'ProcedureSourceConcept',
      'SpecimenSourceConcept',
      'SponsorConcept',
      'SponsorSourceConcept',
      'StopReasonConcept',
      'StopReasonSourceConcept',
      'VisitDetailSourceConcept',
      'VisitSourceConcept',
    ])
  })

  it('reports a CodesetId the schema does not mark as a reference', () => {
    const expression = {
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 1, SecondaryCodesetId: 2 } }],
      },
    } as unknown as CohortExpression
    const pathOf = new Map([
      [1, 'PrimaryCriteria.CriteriaList[].ConditionOccurrence.CodesetId'],
      [2, 'PrimaryCriteria.CriteriaList[].ConditionOccurrence.SecondaryCodesetId'],
    ])

    expect(audit({ expressions: [expression], pathOf }).missing).toEqual([
      'PrimaryCriteria.CriteriaList[].ConditionOccurrence.SecondaryCodesetId',
    ])
  })

  it('reports a reference field declared with a lookalike z.number()', () => {
    const patched = ConditionOccurrenceSchema as unknown as {
      _def: { shape: () => Record<string, z.ZodTypeAny> }
    }
    const declaredShape = patched._def.shape

    let missing: string[]
    try {
      patched._def.shape = () => ({ ...declaredShape(), CodesetId: z.number().nullish() })
      missing = audit(buildCorpus()).missing
    } finally {
      patched._def.shape = declaredShape
    }

    expect(missing.length).toBeGreaterThan(0)
    expect(missing.every(path => path.endsWith('ConditionOccurrence.CodesetId'))).toBe(true)
    expect(audit(buildCorpus()).missing).toEqual([])
  })
})
