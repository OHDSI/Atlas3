import { describe, it, expect, vi } from 'vitest'

import {
  computeBinaryStdDiff,
  mapCharacterizationResultReport,
  mapCharacterizationResults,
  overallCohortSizes,
  strataCount,
} from '@/utils/characterization-result-mapper'
import type { CharacterizationResultReport } from '@/models/characterization.types'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const prevalenceRow = (over: Record<string, unknown> = {}) => ({
  analysisId: 1,
  covariateId: 10,
  covariateName: 'X',
  cohortId: 1,
  count: 5,
  pct: 50,
  ...over,
})

function report(over: Partial<CharacterizationResultReport>): CharacterizationResultReport {
  return {
    analysisId: 1,
    analysisName: 'Report',
    cohorts: [{ cohortId: 1, cohortName: 'T' }],
    domainIds: [],
    items: [],
    ...over,
  } as CharacterizationResultReport
}

describe('strataCount / overallCohortSizes', () => {
  const counts = { '1': { '0': 100, '2': 40 }, '2': { '2': 7 }, '3': { '0': Number.NaN } }

  it('reads the overall count from strata id 0 and other partitions by key', () => {
    expect(strataCount(counts, 1)).toBe(100)
    expect(strataCount(counts, '1', 'overall')).toBe(100)
    expect(strataCount(counts, 1, '2')).toBe(40)
  })

  it('returns undefined for unknown cohorts, missing partitions and non-finite counts', () => {
    expect(strataCount(counts, 9)).toBeUndefined()
    expect(strataCount(counts, 2)).toBeUndefined()
    expect(strataCount(counts, 3)).toBeUndefined()
    expect(strataCount({ '1': { '0': Number.POSITIVE_INFINITY } }, 1)).toBeUndefined()
    expect(strataCount({ '1': { '0': '5' as unknown as number } }, 1)).toBeUndefined()
    expect(strataCount(null, 1)).toBeUndefined()
  })

  it('collects overall sizes only for cohorts that report one', () => {
    expect(overallCohortSizes(counts)).toStrictEqual({ '1': 100 })
    expect(overallCohortSizes(undefined)).toEqual({})
  })
})

describe('mapCharacterizationResults field mapping', () => {
  it('splits PascalCase analysis names into words, keeping acronyms together', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ analysisId: 1, analysisName: 'DrugGroupEraStartLongTerm' }),
      prevalenceRow({ analysisId: 2, analysisName: 'HTMLParser' }),
      prevalenceRow({ analysisId: 3, analysisName: 'Already spaced' }),
      prevalenceRow({ analysisId: 4 }),
    ])
    expect(out.prevalence.map(p => p.analysisName)).toEqual([
      'Drug Group Era Start Long Term',
      'HTML Parser',
      'Already spaced',
      'Analysis 4',
    ])
  })

  it('defaults missing concept ids to 0 and cohort names to "Cohort <id>"', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ cohortId: 7 }),
      { analysisId: 2, covariateId: 20, cohortId: 7, avg: 1, stdDev: 1 },
      prevalenceRow({ covariateId: 30, conceptId: 300 }),
      { analysisId: 2, covariateId: 40, cohortId: 7, avg: 1, stdDev: 1, conceptId: 400 },
    ])
    expect(out.prevalence.map(p => p.conceptId)).toEqual([0, 300])
    expect(out.distribution.map(d => d.conceptId)).toEqual([0, 400])
    expect(out.prevalence[0]?.cohorts).toEqual([{ id: 7, name: 'Cohort 7' }])
    expect(out.distribution[0]?.analysisName).toBe('Analysis 2')
  })

  it('drops rows missing either id even when they carry statistics', () => {
    const out = mapCharacterizationResults([
      { analysisId: 1, cohortId: 1, count: 5, pct: 5 },
      { covariateId: 1, cohortId: 1, count: 5, pct: 5 },
    ])
    expect(out.prevalence).toEqual([])
  })

  it('drops unclassifiable and cohortless rows instead of mapping them', () => {
    const out = mapCharacterizationResults([
      { analysisId: 1, covariateId: 1, cohortId: 1 },
      { analysisId: 1, covariateId: 2, count: 5, pct: 5 },
      { analysisId: 1, covariateId: 3, avg: 5, stdDev: 1 },
    ])
    expect(out.prevalence).toEqual([])
    expect(out.distribution).toEqual([])
  })

  it('treats an item with only one comparative cohort id as a plain row', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ covariateId: 1, cohortId: 5, targetCohortId: 9 }),
      prevalenceRow({ covariateId: 2, cohortId: 5, comparatorCohortId: 9 }),
    ])
    expect(out.prevalence.map(p => p.cohorts)).toEqual([
      [{ id: 5, name: 'Cohort 5' }],
      [{ id: 5, name: 'Cohort 5' }],
    ])
  })

  it('expands comparative prevalence items, carrying shared fields to both cohorts', () => {
    const out = mapCharacterizationResults([{
      analysisId: 1,
      analysisName: 'Conditions',
      covariateId: 2,
      covariateName: 'condition: Diabetes',
      covariateShortName: 'Diabetes',
      conceptId: 3,
      conceptName: 'Diabetes mellitus',
      domainId: 'Condition',
      faType: 'PRESET',
      strataId: 4,
      strataName: 'Female',
      diff: 0.3,
      targetCohortId: 10,
      targetCohortName: 'T',
      targetCount: 8,
      targetPct: 40,
      comparatorCohortId: 20,
      comparatorCohortName: 'C',
      comparatorCount: 2,
      comparatorPct: 10,
    }])
    expect(out.prevalence).toHaveLength(1)
    const stat = out.prevalence[0]
    expect(stat).toMatchObject({
      analysisName: 'Conditions',
      covariateName: 'Diabetes',
      conceptId: 3,
      conceptName: 'Diabetes mellitus',
      domainId: 'Condition',
      faType: 'PRESET',
      cohorts: [{ id: 10, name: 'T' }, { id: 20, name: 'C' }],
      strataNames: { '4': 'Female' },
      count: { '4': { '10': 8, '20': 2 } },
      pct: { '4': { '10': 40, '20': 10 } },
      stdDiffByStrata: { '4': 0.3 },
    })
    expect(stat?.stdDiff).toBeCloseTo(computeBinaryStdDiff(40, 10)!, 12)
  })
})

describe('mapCharacterizationResults classification', () => {
  it('honors an explicit result type case-insensitively', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ covariateId: 1, resultType: 'prevalence', stdDev: 2 }),
      prevalenceRow({ covariateId: 2, resultType: 'Distribution', avg: 3 }),
    ])
    expect(out.prevalence.map(p => p.covariateId)).toEqual([1])
    expect(out.distribution.map(d => d.covariateId)).toEqual([2])
  })

  it('infers the type when the explicit result type is unknown', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ covariateId: 1, resultType: 'OTHER' }),
      prevalenceRow({ covariateId: 2, resultType: 42 }),
    ])
    expect(out.prevalence.map(p => p.covariateId)).toEqual([1, 2])
  })

  it.each(['stdDev', 'median', 'p25', 'p75'])('infers a distribution row from %s alone', field => {
    const out = mapCharacterizationResults([{ analysisId: 1, covariateId: 1, cohortId: 1, avg: 0.5, [field]: 1 }])
    expect(out.distribution).toHaveLength(1)
    expect(out.prevalence).toEqual([])
  })

  it.each(['count', 'pct'])('infers a prevalence row from %s alone', field => {
    const out = mapCharacterizationResults([{ analysisId: 1, covariateId: 1, cohortId: 1, [field]: 3 }])
    expect(out.prevalence).toHaveLength(1)
    expect(out.distribution).toEqual([])
  })
})

describe('mapCharacterizationResults strata and values', () => {
  it('keys blank and null strata ids as overall and keeps 0 as its own stratum', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ cohortId: 1, strataId: '' }),
      prevalenceRow({ cohortId: 2, strataId: null }),
      prevalenceRow({ cohortId: 3, strataId: 0 }),
    ])
    expect(Object.keys(out.prevalence[0]!.count).sort()).toEqual(['0', 'overall'])
    expect(out.prevalence[0]?.count.overall).toEqual({ '1': 5, '2': 5 })
  })

  it('names a stratum after its key when WebAPI sends no strata name', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ strataId: 3 }),
      { analysisId: 2, covariateId: 1, cohortId: 1, strataId: 4, avg: 1, stdDev: 1 },
    ])
    expect(out.prevalence[0]?.strataNames).toEqual({ '3': '3' })
    expect(out.distribution[0]?.strataNames).toEqual({ '4': '4' })
  })

  it('skips NaN and non-numeric values', () => {
    const out = mapCharacterizationResults([prevalenceRow({ count: '5', pct: Number.NaN, diff: '0.1' })])
    expect(out.prevalence[0]?.count).toEqual({})
    expect(out.prevalence[0]?.pct).toEqual({})
    expect(out.prevalence[0]?.stdDiffByStrata).toStrictEqual({})
  })

  it('lists a cohort once across its strata rows', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ strataId: 1 }),
      prevalenceRow({ strataId: 2 }),
      { analysisId: 2, covariateId: 1, cohortId: 1, strataId: 1, avg: 1, stdDev: 1 },
      { analysisId: 2, covariateId: 1, cohortId: 1, strataId: 2, avg: 2, stdDev: 1 },
    ])
    expect(out.prevalence[0]?.cohorts).toHaveLength(1)
    expect(out.distribution[0]?.cohorts).toHaveLength(1)
  })

  it('keeps the server difference of every stratum', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ strataId: 1, diff: 0.1 }),
      prevalenceRow({ strataId: 2, diff: 0.2 }),
    ])
    expect(out.prevalence[0]?.stdDiffByStrata).toEqual({ '1': 0.1, '2': 0.2 })
  })

  it('computes stdDiff from the overall stratum even when another stratum came first', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ cohortId: 1, strataId: 5, pct: 90 }),
      prevalenceRow({ cohortId: 2, strataId: 5, pct: 10 }),
      prevalenceRow({ cohortId: 1, pct: 50 }),
      prevalenceRow({ cohortId: 2, pct: 30 }),
    ])
    expect(out.prevalence[0]?.stdDiff).toBeCloseTo(computeBinaryStdDiff(50, 30)!, 12)
  })

  it('computes stdDiff from the first stratum when there is no overall stratum', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ cohortId: 1, strataId: 5, pct: 90 }),
      prevalenceRow({ cohortId: 2, strataId: 5, pct: 10 }),
      prevalenceRow({ cohortId: 1, strataId: 6, pct: 50 }),
      prevalenceRow({ cohortId: 2, strataId: 6, pct: 30 }),
    ])
    expect(out.prevalence[0]?.stdDiff).toBeCloseTo(computeBinaryStdDiff(90, 10)!, 12)
  })

  it('leaves stdDiff unset for more than two cohorts or an undefined difference', () => {
    const out = mapCharacterizationResults([
      prevalenceRow({ covariateId: 1, cohortId: 1, pct: 50 }),
      prevalenceRow({ covariateId: 1, cohortId: 2, pct: 30 }),
      prevalenceRow({ covariateId: 1, cohortId: 3, pct: 20 }),
      prevalenceRow({ covariateId: 2, cohortId: 1, pct: 0 }),
      prevalenceRow({ covariateId: 2, cohortId: 2, pct: 0 }),
    ])
    expect(out.prevalence[0]).not.toHaveProperty('stdDiff')
    expect(out.prevalence[1]).not.toHaveProperty('stdDiff')
  })
})

describe('mapCharacterizationResults temporal series', () => {
  it('drops malformed points, zero-fills missing values and orders by start then end day', () => {
    const out = mapCharacterizationResults([prevalenceRow({
      temporal: [
        null,
        'x',
        { startDay: 5, endDay: 9, count: 1, avg: 0.1 },
        { startDay: 5, endDay: 6, count: 'n', avg: Number.NaN },
        { startDay: Number.POSITIVE_INFINITY, endDay: 1 },
        { startDay: 1, endDay: Number.NaN },
      ],
      temporalAnnual: [null, { year: 2020, count: 2 }, { year: Number.NaN, count: 1, avg: 1 }],
    })])
    expect(out.prevalence[0]?.temporalByCohort).toEqual({
      '1': {
        temporal: [
          { startDay: 5, endDay: 6, count: 0, avg: 0 },
          { startDay: 5, endDay: 9, count: 1, avg: 0.1 },
        ],
        temporalAnnual: [{ year: 2020, count: 2, avg: 0 }],
      },
    })
  })

  it('keeps an annual-only series', () => {
    const out = mapCharacterizationResults([prevalenceRow({ temporalAnnual: [{ year: 2021, count: 1, avg: 0.5 }] })])
    expect(out.prevalence[0]?.temporalByCohort?.['1']).toEqual({
      temporal: [],
      temporalAnnual: [{ year: 2021, count: 1, avg: 0.5 }],
    })
  })

  it('keeps a daily-only series', () => {
    const out = mapCharacterizationResults([prevalenceRow({ temporal: [{ startDay: 0, endDay: 0, count: 1, avg: 0.5 }] })])
    expect(out.prevalence[0]?.temporalByCohort?.['1']).toEqual({
      temporal: [{ startDay: 0, endDay: 0, count: 1, avg: 0.5 }],
      temporalAnnual: [],
    })
  })
})

describe('computeBinaryStdDiff edge cases', () => {
  it('returns undefined when only one proportion is given', () => {
    expect(computeBinaryStdDiff(0.2, undefined)).toBeUndefined()
    expect(computeBinaryStdDiff(undefined, 0.2)).toBeUndefined()
  })

  it('returns undefined for a non-finite denominator', () => {
    expect(computeBinaryStdDiff(-50, 0.1)).toBeUndefined()
    expect(computeBinaryStdDiff(Number.NaN, 0.1)).toBeUndefined()
  })

  it('keeps the sign of the difference', () => {
    expect(computeBinaryStdDiff(0.3, 0.5)).toBeCloseTo(-0.2 / Math.sqrt((0.21 + 0.25) / 2), 12)
  })
})

describe('mapCharacterizationResultReport', () => {
  it('classifies items by the report result type when they carry none', () => {
    const out = mapCharacterizationResultReport(report({
      resultType: 'DISTRIBUTION',
      items: [{ covariateId: 1, cohortId: 1, count: 4, avg: 2 }],
    }))
    expect(out.distribution).toHaveLength(1)
    expect(out.prevalence).toEqual([])
  })

  it('lets an item result type override the report result type', () => {
    const out = mapCharacterizationResultReport(report({
      resultType: 'DISTRIBUTION',
      items: [{ covariateId: 1, cohortId: 1, count: 4, pct: 4, resultType: 'PREVALENCE' }],
    }))
    expect(out.prevalence).toHaveLength(1)
  })

  it('applies the report feature analysis type unless the item has its own', () => {
    const out = mapCharacterizationResultReport(report({
      resultType: 'PREVALENCE',
      faType: 'CRITERIA_SET',
      items: [
        { covariateId: 1, cohortId: 1, count: 1, pct: 1, covariateName: 'Set: A', covariateShortName: 'A' },
        { covariateId: 2, cohortId: 1, count: 1, pct: 1, covariateName: 'Set: B', covariateShortName: 'B', faType: 'PRESET' },
      ],
    }))
    expect(out.prevalence.map(p => p.covariateName)).toEqual(['Set: A', 'B'])
  })

  it('recomputes stdDiff for two report cohorts after zero-filling the missing cohort', () => {
    const out = mapCharacterizationResultReport(report({
      resultType: 'PREVALENCE',
      cohorts: [{ cohortId: 1, cohortName: 'T' }, { cohortId: 2, cohortName: 'C' }],
      items: [
        { covariateId: 1, cohortId: 1, strataId: 4, strataName: 'Old', count: 1, pct: 90 },
        { covariateId: 1, cohortId: 1, count: 5, pct: 50 },
      ],
    }))
    const row = out.prevalence[0]
    expect(row?.pct).toEqual({ overall: { '1': 50, '2': 0 }, '4': { '1': 90, '2': 0 } })
    expect(row?.stdDiff).toBeCloseTo(computeBinaryStdDiff(50, 0)!, 12)
  })

  it('does not compute stdDiff for a single-cohort report', () => {
    const out = mapCharacterizationResultReport(report({
      resultType: 'PREVALENCE',
      items: [{ covariateId: 1, cohortId: 1, count: 5, pct: 50 }],
    }))
    expect(out.prevalence[0]).not.toHaveProperty('stdDiff')
  })
})
