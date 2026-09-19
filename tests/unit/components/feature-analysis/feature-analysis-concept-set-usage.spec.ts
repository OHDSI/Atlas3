import { describe, expect, it, vi } from 'vitest'
import type {
  FeatureAnalysisCriteriaGroupItem,
  FeatureAnalysisDemographicCriteriaItem,
  FeatureAnalysisWindowedCriteriaItem,
} from '@/models/feature-analysis.types'
import {
  countFeatureAnalysisConceptSetReferences,
  findUsedFeatureAnalysisConceptSetIds,
  unassignFeatureAnalysisConceptSetId,
  walkFeatureAnalysisConceptSetReferences,
} from '@/components/feature-analysis/feature-analysis-concept-set-usage'

const criteriaGroupItem: FeatureAnalysisCriteriaGroupItem = {
  name: 'Criteria group feature',
  criteriaType: 'CriteriaGroup',
  expression: {
    Type: 'ALL',
    CriteriaList: [
      {
        Criteria: {
          ConditionOccurrence: {
            CodesetId: 21,
            GenderCS: { CodesetId: 22, IsExclusion: false },
            CorrelatedCriteria: {
              Type: 'ANY',
              CriteriaList: [
                {
                  Criteria: {
                    DrugExposure: {
                      CodesetId: 23,
                      DrugSourceConcept: 24,
                      RouteConceptCS: { CodesetId: 25, IsExclusion: true },
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
      { GenderCS: { CodesetId: 26, IsExclusion: false } },
    ],
    Groups: [
      {
        Type: 'AT_LEAST',
        Count: 1,
        CriteriaList: [
          {
            Criteria: {
              Measurement: {
                CodesetId: 27,
                MeasurementSourceConcept: 28,
                ValueAsConceptCS: { CodesetId: 29, IsExclusion: false },
              },
            },
          },
        ],
      },
    ],
  },
}

const windowedItem: FeatureAnalysisWindowedCriteriaItem = {
  name: 'Windowed feature',
  criteriaType: 'WindowedCriteria',
  expression: {
    Criteria: {
      DrugExposure: {
        CodesetId: 31,
        DrugSourceConcept: 32,
        RouteConceptCS: { CodesetId: 33, IsExclusion: false },
      },
    },
    StartWindow: { Start: { Days: 1 }, End: { Days: 2 } },
    EndWindow: { Start: { Days: 3 }, End: { Days: 4 } },
    RestrictVisit: true,
    IgnoreObservationPeriod: false,
  },
}

const demographicItem: FeatureAnalysisDemographicCriteriaItem = {
  name: 'Demographic feature',
  criteriaType: 'DemographicCriteria',
  expression: {
    GenderCS: { CodesetId: 34, IsExclusion: false },
    RaceCS: { CodesetId: 35, IsExclusion: true },
    EthnicityCS: { CodesetId: 21, IsExclusion: true },
  },
}

describe('feature-analysis-concept-set-usage', () => {
  it('does nothing when the design array is empty', () => {
    const raw = vi.fn()
    const wrapped = vi.fn()

    walkFeatureAnalysisConceptSetReferences([], { raw, wrapped })

    expect(raw).not.toHaveBeenCalled()
    expect(wrapped).not.toHaveBeenCalled()
  })

  it('visits raw ids and wrapped selections across all feature-analysis design branches', () => {
    const raw = vi.fn()
    const wrapped = vi.fn()

    walkFeatureAnalysisConceptSetReferences([criteriaGroupItem, windowedItem, demographicItem], { raw, wrapped })

    expect(
      raw.mock.calls
        .map(([container, key]) => container[key])
        .filter((value): value is number => typeof value === 'number')
        .sort((a, b) => a - b),
    ).toEqual([21, 23, 24, 27, 28, 31, 32])
    expect(wrapped.mock.calls.map(([selection]) => selection.CodesetId).sort((a, b) => a - b)).toEqual([21, 22, 25, 26, 29, 33, 34, 35])
  })

  it('deduplicates ids from repeated references across design items', () => {
    expect(findUsedFeatureAnalysisConceptSetIds([criteriaGroupItem, windowedItem, demographicItem])).toEqual(
      new Set([21, 22, 23, 24, 25, 26, 27, 28, 29, 31, 32, 33, 34, 35]),
    )
  })

  it('counts and clears matching ids while leaving unrelated selections in place', () => {
    const workingDesign = structuredClone([criteriaGroupItem, windowedItem, demographicItem])

    expect(countFeatureAnalysisConceptSetReferences(workingDesign, 21)).toBe(2)
    expect(countFeatureAnalysisConceptSetReferences(workingDesign, 33)).toBe(1)

    unassignFeatureAnalysisConceptSetId(workingDesign, 21)
    unassignFeatureAnalysisConceptSetId(workingDesign, 33)

    expect(countFeatureAnalysisConceptSetReferences(workingDesign, 21)).toBe(0)
    expect(countFeatureAnalysisConceptSetReferences(workingDesign, 33)).toBe(0)
    expect(workingDesign[0]?.expression.CriteriaList?.[0]?.Criteria?.ConditionOccurrence?.GenderCS).toEqual({ CodesetId: 22, IsExclusion: false })
    expect(workingDesign[1]?.expression.Criteria?.DrugExposure?.RouteConceptCS).toEqual({ CodesetId: undefined, IsExclusion: false })
    expect(workingDesign[2]?.expression.EthnicityCS).toEqual({ CodesetId: undefined, IsExclusion: true })
  })
})