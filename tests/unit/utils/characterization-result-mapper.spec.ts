/**
 * characterization-result-mapper unit tests
 */
import { describe, it, expect, vi } from 'vitest'

import {
  computeBinaryStdDiff,
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

  it('surfaces classifiable-less rows with valid ids as unmapped', () => {
    const raw = [
      {
        analysisId: 500,
        analysisName: 'Days home vs hospital death',
        covariateId: 9001,
        covariateName: 'home death',
        faType: 'CUSTOM_FE',
        cohortId: 1,
        // no count/pct/avg/median/… — a custom-SQL shape the classifier
        // cannot fit into prevalence or distribution.
        deathPlace: 'home',
        deaths: 128,
      },
    ]
    const out = mapCharacterizationResults(raw)
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toEqual([])
    expect(out.unmapped).toHaveLength(1)
    expect(out.unmapped[0]).toMatchObject({
      analysisId: 500,
      faType: 'CUSTOM_FE',
      deathPlace: 'home',
      deaths: 128,
    })
  })

  it('does not surface malformed id-less rows as unmapped', () => {
    const out = mapCharacterizationResults([{ foo: 'bar' }, null, { analysisId: 1 }])
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toEqual([])
    expect(out.unmapped).toEqual([])
  })

  it('includes an empty unmapped array by default', () => {
    expect(mapCharacterizationResults([]).unmapped).toEqual([])
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
