/**
 * Inclusion-rule criteria-group cardinality round-trip.
 *
 * Regression for the bug where convertInternalToAtlas hardcoded the inclusion
 * rule's group Type to 'ALL' and flattened all criteria groups, silently
 * dropping AT_LEAST / AT_MOST + Count. The worst case: an exclusion expressed
 * as a group "AT_MOST 0" became a plain "ALL" group whose single criterion then
 * defaulted to Occurrence AT_LEAST 1 — inverting the exclusion into a
 * requirement.
 */

import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'
import type { AtlasJSON } from '@/models/atlas.types'

function cohortWithInclusionRule(ruleExpression: Record<string, unknown>): AtlasJSON {
  return {
    ConceptSets: [
      {
        id: 0,
        name: 'Type 1 diabetes mellitus',
        expression: {
          items: [
            {
              concept: { CONCEPT_ID: 443238, CONCEPT_NAME: 'Type 1 diabetes mellitus', DOMAIN_ID: 'Condition' },
              includeDescendants: true,
              isExcluded: false,
            },
          ],
        },
      },
    ],
    PrimaryCriteria: {
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'First' },
    },
    InclusionRules: [{ name: 'rule', expression: ruleExpression }],
    QualifiedLimit: { Type: 'First' },
    ExpressionLimit: { Type: 'First' },
    CensoringCriteria: [],
    CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
  } as unknown as AtlasJSON
}

function roundTrip(atlas: AtlasJSON): AtlasJSON {
  const internal = convertAtlasToInternal(atlas)
  return convertInternalToAtlas({
    name: 'Test',
    entryEvents: internal.entryEvents || [],
    qualifyingLimit: internal.qualifyingLimit || 'ALL',
    inclusionRules: internal.inclusionRules || [],
    conceptSets: internal.conceptSets || [],
    ...internal,
  } as Parameters<typeof convertInternalToAtlas>[0])
}

describe('inclusion-rule group cardinality round-trip', () => {
  it('preserves an AT_MOST 0 exclusion group (does not become ALL / at-least-1)', () => {
    const atlas = cohortWithInclusionRule({
      Type: 'AT_MOST',
      Count: 0,
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
      DemographicCriteriaList: [],
      Groups: [],
    })

    const internal = convertAtlasToInternal(atlas)
    const group = internal.inclusionRules![0].criteriaGroups[0]
    expect(group.logicType).toBe('AT_MOST')
    expect(group.count).toBe(0)

    const back = roundTrip(atlas)
    expect(back.InclusionRules![0].expression.Type).toBe('AT_MOST')
    expect(back.InclusionRules![0].expression.Count).toBe(0)
  })

  it('preserves an AT_LEAST 2 group', () => {
    const atlas = cohortWithInclusionRule({
      Type: 'AT_LEAST',
      Count: 2,
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
      DemographicCriteriaList: [],
      Groups: [],
    })
    const back = roundTrip(atlas)
    expect(back.InclusionRules![0].expression.Type).toBe('AT_LEAST')
    expect(back.InclusionRules![0].expression.Count).toBe(2)
  })

  it('still emits ALL (no Count) for a plain ALL group', () => {
    const atlas = cohortWithInclusionRule({
      Type: 'ALL',
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
      DemographicCriteriaList: [],
      Groups: [],
    })
    const back = roundTrip(atlas)
    expect(back.InclusionRules![0].expression.Type).toBe('ALL')
    expect(back.InclusionRules![0].expression.Count).toBeUndefined()
  })
})
