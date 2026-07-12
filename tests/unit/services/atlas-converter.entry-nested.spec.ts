/**
 * Regression: entry-event nested criteria (#131)
 *
 * CIRCE models CorrelatedCriteria as a field of the Criteria class, so it
 * lives *inside* the domain object:
 *
 *   { "ConditionOccurrence": { "CodesetId": 0, "CorrelatedCriteria": {...} } }
 *
 * The converter used to read and write it on the *wrapper* instead — the
 * object that carries StartWindow/Occurrence for inclusion-rule criteria.
 * Entry events have no such wrapper, so every nested criterion on an entry
 * event was silently dropped on import and therefore missing from exports.
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
