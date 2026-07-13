/**
 * Regression: nested criteria on any criterion (#131)
 *
 * CIRCE models CorrelatedCriteria as a field of the Criteria class, so it
 * lives *inside* the domain object, wherever that criterion appears:
 *
 *   entry event:     { "ConditionOccurrence": { CorrelatedCriteria } }
 *   inclusion rule:  { "Criteria": { "ConditionOccurrence": { CorrelatedCriteria } },
 *                      "StartWindow": {...} }
 *
 * The converter used to read and write it on the CorelatedCriteria *wrapper*
 * (the object carrying StartWindow/Occurrence) — a placement CIRCE never
 * emits and never reads. That dropped nested criteria on import for entry
 * events *and* for inclusion-rule criteria alike: across the 1104-cohort
 * phenotype-library fixtures, CorrelatedCriteria appears inside the domain
 * object 448 times on entry events and 104 times under inclusion rules, and
 * on the wrapper zero times. Both paths share convertAtlasToEvent /
 * convertEventToAtlas, so both are covered here.
 */
import { describe, it, expect } from 'vitest'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

/** An entry event whose nested criterion sits inside the domain object. */
function atlasWithEntryNestedCriteria() {
  return {
    ConceptSets: [
      { id: 0, name: 'Stroke', expression: { items: [] } },
      { id: 1, name: 'Anticoagulants', expression: { items: [] } },
    ],
    PrimaryCriteria: {
      CriteriaList: [
        {
          ConditionOccurrence: {
            CodesetId: 0,
            ConditionTypeExclude: false,
            CorrelatedCriteria: {
              Type: 'AT_LEAST',
              Count: 1,
              CriteriaList: [
                {
                  Criteria: { DrugExposure: { CodesetId: 1, DrugTypeExclude: false } },
                  StartWindow: {
                    Start: { Days: 0, Coeff: -1 },
                    End: { Days: 30, Coeff: 1 },
                    UseIndexEnd: false,
                    UseEventEnd: false,
                  },
                  RestrictVisit: false,
                  IgnoreObservationPeriod: false,
                },
              ],
              DemographicCriteriaList: [],
              Groups: [],
            },
          },
        },
      ],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'First' },
    },
    QualifiedLimit: { Type: 'First' },
    ExpressionLimit: { Type: 'All' },
    InclusionRules: [],
    CensoringCriteria: [],
    CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
    CensorWindow: {},
  }
}

/** Read CorrelatedCriteria from where CIRCE keeps it: inside the domain object. */
function nestedOf(entry: unknown) {
  const domain = Object.values(entry as Record<string, unknown>)[0] as
    | { CorrelatedCriteria?: { Type?: string; Count?: number; CriteriaList: unknown[] } }
    | undefined
  return domain?.CorrelatedCriteria
}

describe('atlas-converter: entry-event nested criteria (#131)', () => {
  it('imports CorrelatedCriteria from inside the entry event domain object', () => {
    const internal = convertAtlasToInternal(atlasWithEntryNestedCriteria())

    const nested = internal.entryEvents?.[0]?.nestedCriteria
    expect(nested).toBeDefined()
    expect(nested?.logicType).toBe('AT_LEAST')
    expect(nested?.count).toBe(1)
    expect(nested?.events).toHaveLength(1)
    expect(nested?.events[0]?.criteriaType).toBe('DrugExposure')
  })

  it('exports entry-event nested criteria back inside the domain object', () => {
    const internal = convertAtlasToInternal(atlasWithEntryNestedCriteria())
    const atlas = convertInternalToAtlas({
      name: 'Stroke with anticoagulants',
      qualifyingLimit: 'ALL',
      ...internal,
    } as CohortDefinition)

    const entry = atlas.PrimaryCriteria.CriteriaList[0] as Record<string, unknown>
    // Not on the wrapper — CIRCE would never read it there.
    expect(entry).not.toHaveProperty('CorrelatedCriteria')

    const correlated = nestedOf(entry)
    expect(correlated).toBeDefined()
    expect(correlated?.Type).toBe('AT_LEAST')
    expect(correlated?.CriteriaList).toHaveLength(1)
  })

  it('round-trips without losing the nested criterion', () => {
    const original = atlasWithEntryNestedCriteria()

    const internal = convertAtlasToInternal(original)
    const out = convertInternalToAtlas({
      name: 'x',
      qualifyingLimit: 'ALL',
      ...internal,
    } as CohortDefinition)

    const before = nestedOf(original.PrimaryCriteria.CriteriaList[0])
    const after = nestedOf(out.PrimaryCriteria.CriteriaList[0])

    expect(after?.Type).toBe(before?.Type)
    expect(after?.Count).toBe(before?.Count)
    expect(after?.CriteriaList).toHaveLength(before?.CriteriaList.length ?? 0)
  })

  it('still reads CorrelatedCriteria misplaced on the wrapper by older exports', () => {
    // Cohorts saved while the converter wrote it on the wrapper must keep
    // loading, so the wrapper stays a fallback on import.
    const legacy = atlasWithEntryNestedCriteria()
    const entry = legacy.PrimaryCriteria.CriteriaList[0] as Record<string, unknown>
    const domain = entry.ConditionOccurrence as Record<string, unknown>
    const misplaced = domain.CorrelatedCriteria
    delete domain.CorrelatedCriteria
    entry.CorrelatedCriteria = misplaced

    const internal = convertAtlasToInternal(legacy)

    expect(internal.entryEvents?.[0]?.nestedCriteria?.logicType).toBe('AT_LEAST')
  })
})

/**
 * An inclusion rule whose criterion carries a nested criterion. The rule's
 * CriteriaList holds CorelatedCriteria wrappers (Criteria + StartWindow), and
 * the nested criterion hangs off the *domain* object inside that wrapper —
 * exactly as on an entry event.
 */
function atlasWithInclusionNestedCriteria() {
  const base = atlasWithEntryNestedCriteria()
  const entryDomain = base.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence
  const correlated = entryDomain.CorrelatedCriteria

  return {
    ...base,
    PrimaryCriteria: {
      ...base.PrimaryCriteria,
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } }],
    },
    InclusionRules: [
      {
        name: 'On anticoagulants',
        expression: {
          Type: 'ALL' as const,
          CriteriaList: [
            {
              Criteria: {
                ConditionOccurrence: {
                  CodesetId: 0,
                  ConditionTypeExclude: false,
                  CorrelatedCriteria: correlated,
                },
              },
              StartWindow: {
                Start: { Days: 0, Coeff: -1 },
                End: { Days: 0, Coeff: 1 },
                UseIndexEnd: false,
                UseEventEnd: false,
              },
              RestrictVisit: false,
              IgnoreObservationPeriod: false,
            },
          ],
          DemographicCriteriaList: [],
          Groups: [],
        },
      },
    ],
  }
}

describe('atlas-converter: inclusion-rule nested criteria (#131)', () => {
  it('imports CorrelatedCriteria from inside the wrapped domain object', () => {
    const internal = convertAtlasToInternal(atlasWithInclusionNestedCriteria())

    const criterion = internal.inclusionRules?.[0]?.criteriaGroups?.[0]?.events[0]
    expect(criterion?.criteriaType).toBe('ConditionOccurrence')

    const nested = criterion?.nestedCriteria
    expect(nested).toBeDefined()
    expect(nested?.logicType).toBe('AT_LEAST')
    expect(nested?.events[0]?.criteriaType).toBe('DrugExposure')
  })

  it('exports it back inside the domain object, not on the wrapper', () => {
    const internal = convertAtlasToInternal(atlasWithInclusionNestedCriteria())
    const atlas = convertInternalToAtlas({
      name: 'Stroke with anticoagulants',
      qualifyingLimit: 'ALL',
      ...internal,
    } as CohortDefinition)

    const wrapper = atlas.InclusionRules![0]!.expression.CriteriaList![0] as Record<string, unknown>
    // The wrapper is CIRCE's CorelatedCriteria: Criteria + StartWindow, and no
    // CorrelatedCriteria field of its own.
    expect(wrapper).not.toHaveProperty('CorrelatedCriteria')
    expect(wrapper).toHaveProperty('StartWindow')

    const correlated = nestedOf(wrapper.Criteria)
    expect(correlated?.Type).toBe('AT_LEAST')
    expect(correlated?.CriteriaList).toHaveLength(1)
  })
})
