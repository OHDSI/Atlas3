import { describe, expect, it, vi } from 'vitest'
import type { CriteriaGroup } from '@/models/circe-types'
import {
  countCriteriaGroupConceptSetReferences,
  findUsedCriteriaGroupConceptSetIds,
  unassignCriteriaGroupConceptSetId,
  walkCriteriaGroupConceptSetReferences,
} from '@/components/cohort-editor/criteria-concept-set-usage'

const criteriaGroup: CriteriaGroup = {
  Type: 'ALL',
  CriteriaList: [
    {
      Criteria: {
        ConditionOccurrence: {
          CodesetId: 7,
          GenderCS: { CodesetId: 8, IsExclusion: true },
          CorrelatedCriteria: {
            Type: 'ANY',
            CriteriaList: [
              {
                Criteria: {
                  DrugExposure: {
                    CodesetId: 9,
                    DrugSourceConcept: 10,
                    RouteConceptCS: { CodesetId: 11, IsExclusion: false },
                  },
                },
              },
            ],
          },
        },
      },
    },
  ],
  DemographicCriteriaList: [
    { GenderCS: { CodesetId: 12, IsExclusion: false } },
    { RaceCS: { CodesetId: 7, IsExclusion: true } },
  ],
  Groups: [
    {
      Type: 'AT_LEAST',
      Count: 1,
      CriteriaList: [
        {
          Criteria: {
            Measurement: {
              CodesetId: 13,
              MeasurementSourceConcept: 15,
              ValueAsConceptCS: { CodesetId: 14, IsExclusion: false },
            },
          },
        },
      ],
    },
  ],
}

describe('criteria-concept-set-usage', () => {
  it('does nothing when the criteria group is undefined', () => {
    const raw = vi.fn()
    const wrapped = vi.fn()

    walkCriteriaGroupConceptSetReferences(undefined, { raw, wrapped })

    expect(raw).not.toHaveBeenCalled()
    expect(wrapped).not.toHaveBeenCalled()
  })

  it('visits both raw ids and wrapped selections across nested criteria', () => {
    const raw = vi.fn()
    const wrapped = vi.fn()

    walkCriteriaGroupConceptSetReferences(criteriaGroup, { raw, wrapped })

    expect(
      raw.mock.calls
        .map(([container, key]) => container[key])
        .filter((value): value is number => typeof value === 'number')
        .sort((a, b) => a - b),
    ).toEqual([7, 9, 10, 13, 15])
    expect(wrapped.mock.calls.map(([selection]) => selection.CodesetId).sort((a, b) => a - b)).toEqual([7, 8, 11, 12, 14])
  })

  it('collects used ids from every nested criteria branch and deduplicates them', () => {
    expect(findUsedCriteriaGroupConceptSetIds([criteriaGroup, undefined])).toEqual(new Set([7, 8, 9, 10, 11, 12, 13, 14, 15]))
  })

  it('counts and clears matching ids without disturbing unrelated references', () => {
    const workingGroup: CriteriaGroup = structuredClone(criteriaGroup)

    expect(countCriteriaGroupConceptSetReferences([workingGroup], 7)).toBe(2)
    expect(countCriteriaGroupConceptSetReferences([workingGroup], 11)).toBe(1)

    unassignCriteriaGroupConceptSetId([workingGroup], 7)
    unassignCriteriaGroupConceptSetId([workingGroup], 11)

    expect(countCriteriaGroupConceptSetReferences([workingGroup], 7)).toBe(0)
    expect(countCriteriaGroupConceptSetReferences([workingGroup], 11)).toBe(0)
    expect(workingGroup.CriteriaList?.[0]?.Criteria?.ConditionOccurrence?.GenderCS).toEqual({ CodesetId: 8, IsExclusion: true })
    expect(workingGroup.CriteriaList?.[0]?.Criteria?.ConditionOccurrence?.CorrelatedCriteria?.CriteriaList?.[0]?.Criteria?.DrugExposure?.DrugSourceConcept).toBe(10)
    expect(workingGroup.CriteriaList?.[0]?.Criteria?.ConditionOccurrence?.CorrelatedCriteria?.CriteriaList?.[0]?.Criteria?.DrugExposure?.RouteConceptCS).toEqual({ CodesetId: undefined, IsExclusion: false })
  })
})