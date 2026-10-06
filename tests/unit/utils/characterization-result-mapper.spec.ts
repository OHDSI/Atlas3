/**
 * characterization-result-mapper unit tests
 */
import { describe, it, expect, vi } from 'vitest'

import {
  computeBinaryStdDiff,
  mapCharacterizationResultReport,
  mapCharacterizationResults,
  DEFAULT_STRATA_KEY,
} from '@/utils/characterization-result-mapper'

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('mapCharacterizationResults', () => {
  it('returns empty arrays for an empty input', () => {
    const out = mapCharacterizationResults([])
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toEqual([])
  })

  it('drops rows missing required ids', () => {
    const out = mapCharacterizationResults([
      { foo: 'bar' },
      null,
      'string',
      { analysisId: 1 }, // no covariateId
      { covariateId: 2 }, // no analysisId
    ])
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toEqual([])
  })

  it('maps a single-cohort prevalence row', () => {
    const raw = [
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        conceptName: 'White',
        domainId: 'DEMOGRAPHICS',
        cohortId: 1,
        cohortName: 'Cohort A',
        count: 42,
        pct: 7.5,
      },
    ]
    const out = mapCharacterizationResults(raw)
    expect(out.distribution).toEqual([])
    expect(out.prevalence).toHaveLength(1)
    const row = out.prevalence[0]
    expect(row.analysisId).toBe(100)
    expect(row.covariateId).toBe(8527)
    expect(row.cohorts).toEqual([{ id: 1, name: 'Cohort A' }])
    expect(row.count[DEFAULT_STRATA_KEY]['1']).toBe(42)
    expect(row.pct[DEFAULT_STRATA_KEY]['1']).toBe(7.5)
    // Single cohort -> no std-diff
    expect(row.stdDiff).toBeUndefined()
  })

  it('groups two-cohort prevalence rows and computes stdDiff', () => {
    const raw = [
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        cohortId: 1,
        cohortName: 'Target',
        count: 100,
        pct: 50,
      },
      {
        analysisId: 100,
        analysisName: 'Race',
        covariateId: 8527,
        covariateName: 'race = White',
        conceptId: 8527,
        cohortId: 2,
        cohortName: 'Comparator',
        count: 50,
        pct: 30,
      },
    ]
    const out = mapCharacterizationResults(raw)
    expect(out.prevalence).toHaveLength(1)
    const row = out.prevalence[0]
    expect(row.cohorts).toEqual([
      { id: 1, name: 'Target' },
      { id: 2, name: 'Comparator' },
    ])
    expect(row.pct[DEFAULT_STRATA_KEY]['1']).toBe(50)
    expect(row.pct[DEFAULT_STRATA_KEY]['2']).toBe(30)

    // Manual: p1=0.5, p2=0.3; denom = sqrt((0.25 + 0.21) / 2) = sqrt(0.23)
    const expected = (0.5 - 0.3) / Math.sqrt((0.5 * 0.5 + 0.3 * 0.7) / 2)
    expect(row.stdDiff).toBeCloseTo(expected, 6)
  })

  it('respects an explicit resultType discriminator over inferred type', () => {
    const raw = [
      {
        analysisId: 200,
        analysisName: 'Length of stay',
        covariateId: 1,
        covariateName: 'length of stay',
        conceptId: 0,
        cohortId: 1,
        cohortName: 'Cohort A',
        resultType: 'DISTRIBUTION',
        count: 1234, // would otherwise look like prevalence
        avg: 7.2,
        stdDev: 2.1,
        min: 0,
        p10: 1,
        p25: 3,
        median: 7,
        p75: 10,
        p90: 14,
        max: 30,
      },
    ]
    const out = mapCharacterizationResults(raw)
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toHaveLength(1)
    const dist = out.distribution[0]
    expect(dist.avg[DEFAULT_STRATA_KEY]['1']).toBe(7.2)
    expect(dist.median[DEFAULT_STRATA_KEY]['1']).toBe(7)
    expect(dist.max[DEFAULT_STRATA_KEY]['1']).toBe(30)
    expect(dist.cohorts).toEqual([{ id: 1, name: 'Cohort A' }])
  })

  it('keys multiple strata under their strataId', () => {
    const raw = [
      {
        analysisId: 1,
        covariateId: 100,
        covariateName: 'X',
        conceptId: 100,
        cohortId: 1,
        strataId: 'M',
        strataName: 'Male',
        count: 5,
        pct: 5,
      },
      {
        analysisId: 1,
        covariateId: 100,
        covariateName: 'X',
        conceptId: 100,
        cohortId: 1,
        strataId: 'F',
        strataName: 'Female',
        count: 7,
        pct: 7,
      },
    ]
    const out = mapCharacterizationResults(raw)
    expect(out.prevalence).toHaveLength(1)
    expect(out.prevalence[0].count.M['1']).toBe(5)
    expect(out.prevalence[0].count.F['1']).toBe(7)
  })

  it('expands comparative target and comparator items', () => {
    const out = mapCharacterizationResults([{
      analysisId: 1, analysisName: 'Measures', covariateId: 2, covariateName: 'Weight', conceptId: 3,
      resultType: 'DISTRIBUTION', targetCohortId: 10, targetCohortName: 'Target', targetAvg: 70,
      targetStdDev: 8, targetMin: 45, targetP10: 50, targetP25: 60, targetMedian: 70,
      targetP75: 80, targetP90: 90, targetMax: 100, comparatorCohortId: 20,
      comparatorCohortName: 'Comparator', comparatorAvg: 75, comparatorStdDev: 9,
      comparatorMin: 50, comparatorP10: 55, comparatorP25: 65, comparatorMedian: 75,
      comparatorP75: 85, comparatorP90: 95, comparatorMax: 105,
    }])

    expect(out.distribution).toHaveLength(1)
    const distribution = out.distribution[0]
    expect(distribution.cohorts).toEqual([{ id: 10, name: 'Target' }, { id: 20, name: 'Comparator' }])
    expect(distribution.avg.overall).toEqual({ '10': 70, '20': 75 })
    expect(distribution.max.overall).toEqual({ '10': 100, '20': 105 })
  })

  it('infers distribution rows and skips unclassifiable or cohortless rows', () => {
    const out = mapCharacterizationResults([
      { analysisId: 1, covariateId: 2, cohortId: 3, covariateShortName: ' Short name ', avg: 5, stdDev: 1 },
      { analysisId: 1, covariateId: 3, cohortId: 3 },
      { analysisId: 1, covariateId: 4, count: 1, pct: Number.NaN },
    ])

    expect(out.distribution[0]?.covariateName).toBe('Short name')
    expect(out.prevalence).toEqual([])
  })

  it('uses report defaults and preserves report cohorts for sparse distribution rows', () => {
    const out = mapCharacterizationResultReport({
      analysisId: 1, analysisName: 'Measures', resultType: 'DISTRIBUTION',
      cohorts: [{ cohortId: 1, cohortName: 'Target' }, { cohortId: 2, cohortName: 'Comparator' }],
      domainIds: [], items: [{ covariateId: 2, covariateName: 'Weight', conceptId: 3, cohortId: 1, avg: 70, stdDev: 8 }],
    })

    expect(out.distribution[0]?.analysisName).toBe('Measures')
    expect(out.distribution[0]?.cohorts).toEqual([{ id: 1, name: 'Target' }, { id: 2, name: 'Comparator' }])
  })

  it('normalizes two-cohort prevalence reports with fallback labels and server differences', () => {
    const out = mapCharacterizationResultReport({
      analysisId: 1, analysisName: 'Demographics', resultType: 'PREVALENCE',
      cohorts: [{ cohortId: 1, cohortName: 'Target' }, { cohortId: 2, cohortName: 'Comparator' }],
      domainIds: [], items: [
        { covariateId: 9, conceptId: 0, cohortId: 1, count: 10, pct: 10, diff: 0.25 },
        { covariateId: 9, conceptId: 0, cohortId: 2, count: 20, pct: 20, diff: 0.25 },
      ],
    })

    expect(out.prevalence[0]?.covariateName).toBe('Covariate 9')
    expect(out.prevalence[0]?.stdDiff).toBeDefined()
    expect(out.prevalence[0]?.stdDiffByStrata?.overall).toBe(0.25)
  })

  it('zero-fills a covariate missing from another subgroup', () => {
    const out = mapCharacterizationResultReport({
      analysisId: 1,
      analysisName: 'Demographics',
      cohorts: [{ cohortId: 1, cohortName: 'Target' }],
      domainIds: ['DEMOGRAPHICS'],
      items: [
        {
          analysisId: 1,
          covariateId: 100,
          covariateName: 'Male',
          conceptId: 100,
          cohortId: 1,
          strataId: 0,
          strataName: 'Overall',
          count: 50,
          pct: 50,
        },
        {
          analysisId: 1,
          covariateId: 200,
          covariateName: 'Female subgroup covariate',
          conceptId: 200,
          cohortId: 1,
          strataId: 2,
          strataName: 'Female',
          count: 10,
          pct: 10,
        },
      ],
    })

    const male = out.prevalence.find(row => row.covariateId === 100)
    expect(male?.count['2']?.['1']).toBe(0)
    expect(male?.pct['2']?.['1']).toBe(0)
    expect(male?.strataNames['2']).toBe('Female')
  })
})

describe('computeBinaryStdDiff', () => {
  it('returns undefined when inputs are missing', () => {
    expect(computeBinaryStdDiff(undefined, 0.1)).toBeUndefined()
    expect(computeBinaryStdDiff(0.1, undefined)).toBeUndefined()
  })

  it('returns undefined when the denominator is zero', () => {
    expect(computeBinaryStdDiff(0, 0)).toBeUndefined()
    expect(computeBinaryStdDiff(1, 1)).toBeUndefined()
  })

  it('handles input as proportions (0-1)', () => {
    const v = computeBinaryStdDiff(0.5, 0.3)
    const expected = (0.5 - 0.3) / Math.sqrt((0.25 + 0.21) / 2)
    expect(v).toBeCloseTo(expected, 6)
  })

  it('handles input as percentages (0-100)', () => {
    const v = computeBinaryStdDiff(50, 30)
    const expected = (0.5 - 0.3) / Math.sqrt((0.25 + 0.21) / 2)
    expect(v).toBeCloseTo(expected, 6)
  })
})
