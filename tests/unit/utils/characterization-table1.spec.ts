import { describe, it, expect } from 'vitest'
import { buildTable1 } from '@/utils/characterization-table1'
import {
  DEFAULT_TABLE1_CONFIG,
  DEFAULT_TABLE1_FILTERS,
  type DistributionStat,
  type LinkedCohort,
  type PrevalenceStat,
  type Table1Config,
  type Table1Filters,
} from '@/models/characterization.types'

const COHORT_A: LinkedCohort = { id: 1, name: 'Metformin' }
const COHORT_B: LinkedCohort = { id: 2, name: 'Sulfonylurea' }

function prev(opts: {
  analysisId: number
  analysisName: string
  covariateId: number
  covariateName: string
  conceptId?: number
  domainId?: string
  cohorts: LinkedCohort[]
  byCohort: Record<string, { count: number; pct: number }>
  stdDiff?: number
  strataKey?: string
}): PrevalenceStat {
  const k = opts.strataKey ?? 'overall'
  const count: Record<string, Record<string, number>> = { [k]: {} }
  const pct: Record<string, Record<string, number>> = { [k]: {} }
  for (const [cohortId, v] of Object.entries(opts.byCohort)) {
    count[k]![cohortId] = v.count
    pct[k]![cohortId] = v.pct
  }
  return {
    analysisId: opts.analysisId,
    analysisName: opts.analysisName,
    covariateId: opts.covariateId,
    covariateName: opts.covariateName,
    conceptId: opts.conceptId ?? 0,
    domainId: opts.domainId,
    cohorts: opts.cohorts,
    count,
    pct,
    stdDiff: opts.stdDiff,
  }
}

function dist(opts: {
  analysisId: number
  analysisName: string
  covariateId: number
  covariateName: string
  cohorts: LinkedCohort[]
  byCohort: Record<string, { avg: number; stdDev: number; median: number; p25: number; p75: number }>
}): DistributionStat {
  const k = 'overall'
  const blank = (): Record<string, Record<string, number>> => ({ [k]: {} })
  const out: DistributionStat = {
    analysisId: opts.analysisId,
    analysisName: opts.analysisName,
    covariateId: opts.covariateId,
    covariateName: opts.covariateName,
    conceptId: 0,
    cohorts: opts.cohorts,
    avg: blank(),
    stdDev: blank(),
    min: blank(),
    p10: blank(),
    p25: blank(),
    median: blank(),
    p75: blank(),
    p90: blank(),
    max: blank(),
  }
  for (const [cohortId, v] of Object.entries(opts.byCohort)) {
    out.avg[k]![cohortId] = v.avg
    out.stdDev[k]![cohortId] = v.stdDev
    out.median[k]![cohortId] = v.median
    out.p25[k]![cohortId] = v.p25
    out.p75[k]![cohortId] = v.p75
  }
  return out
}

const baseInput = (over: Partial<{
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: LinkedCohort[]
  config: Table1Config
  filters: Table1Filters
}> = {}) => ({
  prevalence: over.prevalence ?? [],
  distribution: over.distribution ?? [],
  cohorts: over.cohorts ?? [COHORT_A, COHORT_B],
  config: over.config ?? DEFAULT_TABLE1_CONFIG,
  filters: over.filters ?? DEFAULT_TABLE1_FILTERS,
})

describe('buildTable1', () => {
  it('returns empty rows when no data', () => {
    const result = buildTable1(baseInput())
    expect(result.rows).toEqual([])
    expect(result.columns).toHaveLength(2)
  })

  it('emits one column per cohort by default', () => {
    const result = buildTable1(baseInput())
    expect(result.columns.map(c => c.cohortId)).toEqual([1, 2])
    expect(result.columns.every(c => c.strataKey === undefined)).toBe(true)
  })

  it('groups binary rows by analysis when groupByAnalysis is on', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Female', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
        prev({ analysisId: 2, analysisName: 'Conditions', covariateId: 21,
               covariateName: 'Hypertension', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 60, pct: 30 } } }),
      ],
    }))
    const kinds = result.rows.map(r => r.kind)
    expect(kinds).toEqual(['group', 'binary', 'group', 'binary'])
    expect((result.rows[0] as { label: string }).label).toBe('Demographics')
    expect((result.rows[2] as { label: string }).label).toBe('Conditions')
  })

  it('flattens rows alphabetically when groupByAnalysis is off', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Female', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
        prev({ analysisId: 2, analysisName: 'Conditions', covariateId: 21,
               covariateName: 'Hypertension', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 60, pct: 30 } } }),
      ],
      config: { ...DEFAULT_TABLE1_CONFIG, groupByAnalysis: false },
    }))
    expect(result.rows.map(r => r.kind)).toEqual(['binary', 'binary'])
    const labels = result.rows.map(r => (r as { label: string }).label)
    expect(labels).toEqual(['Female', 'Hypertension'])
  })

  it('drops binary rows below threshold across all cohorts', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Female', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 12,
               covariateName: 'Rare', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 1, pct: 0.5 }, '2': { count: 2, pct: 0.7 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 1 },
    }))
    const labels = result.rows.filter(r => r.kind !== 'group')
                               .map(r => (r as { label: string }).label)
    expect(labels).toEqual(['Female'])
  })

  it('keeps a row that clears threshold in any cohort', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Edge', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 1, pct: 0.5 }, '2': { count: 50, pct: 5 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 1 },
    }))
    expect(result.rows.filter(r => r.kind === 'binary')).toHaveLength(1)
  })

  it('drops empty groups after filtering', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Rare', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 1, pct: 0.5 }, '2': { count: 1, pct: 0.5 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 5 },
    }))
    expect(result.rows).toEqual([])
  })

  it('honors selected analysis filter', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Demographics', covariateId: 11,
               covariateName: 'Female', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
        prev({ analysisId: 2, analysisName: 'Conditions', covariateId: 21,
               covariateName: 'HTN', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 60, pct: 30 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, selectedAnalysisIds: [2] },
    }))
    const labels = result.rows.filter(r => r.kind === 'binary')
                              .map(r => (r as { label: string }).label)
    expect(labels).toEqual(['HTN'])
  })

  it('honors selected domain filter', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
               domainId: 'Drug', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 50, pct: 25 } } }),
        prev({ analysisId: 1, analysisName: 'A', covariateId: 12, covariateName: 'Y',
               domainId: 'Condition', cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 50, pct: 25 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, selectedDomains: ['Drug'] },
    }))
    const labels = result.rows.filter(r => r.kind === 'binary')
                              .map(r => (r as { label: string }).label)
    expect(labels).toEqual(['X'])
  })

  it('honors selected cohort filter', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'shared',
               cohorts: [COHORT_A, COHORT_B],
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 50, pct: 25 } } }),
        prev({ analysisId: 1, analysisName: 'A', covariateId: 12, covariateName: 'aOnly',
               cohorts: [COHORT_A],
               byCohort: { '1': { count: 50, pct: 25 } } }),
      ],
      filters: { ...DEFAULT_TABLE1_FILTERS, selectedCohortId: 2 },
    }))
    const labels = result.rows.filter(r => r.kind === 'binary')
                              .map(r => (r as { label: string }).label)
    expect(labels).toEqual(['shared'])
  })

  it('emits Std Diff cell only when exactly 2 cohorts and showStdDiff', () => {
    const r2 = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
               cohorts: [COHORT_A, COHORT_B], stdDiff: 0.42,
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
      ],
    }))
    const row = r2.rows.find(r => r.kind === 'binary') as { stdDiff?: number }
    expect(row.stdDiff).toBe(0.42)
    expect(r2.includeStdDiff).toBe(true)

    const r1 = buildTable1(baseInput({ cohorts: [COHORT_A] }))
    expect(r1.includeStdDiff).toBe(false)

    const off = buildTable1(baseInput({
      config: { ...DEFAULT_TABLE1_CONFIG, showStdDiff: false },
    }))
    expect(off.includeStdDiff).toBe(false)
  })

  it('emits one column per (cohort, stratum) when strataAsCols is on', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
               cohorts: [COHORT_A, COHORT_B],
               strataKey: 'overall',
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 80, pct: 40 } } }),
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'X',
               cohorts: [COHORT_A, COHORT_B],
               strataKey: 'age65',
               byCohort: { '1': { count: 30, pct: 15 }, '2': { count: 25, pct: 12.5 } } }),
      ],
      config: { ...DEFAULT_TABLE1_CONFIG, strataAsCols: true },
    }))
    expect(result.columns).toHaveLength(4)
    expect(result.columns.map(c => c.cohortKey)).toEqual([
      '1::overall', '1::age65', '2::overall', '2::age65',
    ])
    expect(result.includeStdDiff).toBe(false)
  })

  it('emits continuous rows from distribution data with mean-sd format', () => {
    const result = buildTable1(baseInput({
      distribution: [
        dist({ analysisId: 1, analysisName: 'Demographics', covariateId: 99,
               covariateName: 'Age', cohorts: [COHORT_A, COHORT_B],
               byCohort: {
                 '1': { avg: 62.4, stdDev: 12.1, median: 62, p25: 55, p75: 70 },
                 '2': { avg: 66.1, stdDev: 10.8, median: 66, p25: 59, p75: 73 },
               } }),
      ],
    }))
    const row = result.rows.find(r => r.kind === 'continuous') as
      { stat: string; cells: Record<string, { primary: number; secondary: number } | null> }
    expect(row.stat).toBe('mean-sd')
    expect(row.cells['1']!.primary).toBeCloseTo(62.4)
    expect(row.cells['1']!.secondary).toBeCloseTo(12.1)
  })

  it('uses median-iqr format when configured', () => {
    const result = buildTable1(baseInput({
      distribution: [
        dist({ analysisId: 1, analysisName: 'A', covariateId: 99, covariateName: 'Age',
               cohorts: [COHORT_A, COHORT_B],
               byCohort: {
                 '1': { avg: 62.4, stdDev: 12.1, median: 62, p25: 55, p75: 70 },
                 '2': { avg: 66.1, stdDev: 10.8, median: 66, p25: 59, p75: 73 },
               } }),
      ],
      config: { ...DEFAULT_TABLE1_CONFIG, continuousFormat: 'median-iqr' },
    }))
    const row = result.rows.find(r => r.kind === 'continuous') as
      { stat: string; cells: Record<string, { primary: number; secondary: number } | null> }
    expect(row.stat).toBe('median-iqr')
    expect(row.cells['1']!.primary).toBe(62)
    expect(row.cells['1']!.secondary).toBe(70 - 55)
  })

  it('pins top-K rows by absolute std diff when enabled', () => {
    const result = buildTable1(baseInput({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'A', covariateId: 11, covariateName: 'small',
               cohorts: [COHORT_A, COHORT_B], stdDiff: 0.05,
               byCohort: { '1': { count: 50, pct: 25 }, '2': { count: 50, pct: 25 } } }),
        prev({ analysisId: 1, analysisName: 'A', covariateId: 12, covariateName: 'big',
               cohorts: [COHORT_A, COHORT_B], stdDiff: 0.42,
               byCohort: { '1': { count: 100, pct: 50 }, '2': { count: 30, pct: 15 } } }),
        prev({ analysisId: 1, analysisName: 'A', covariateId: 13, covariateName: 'medium',
               cohorts: [COHORT_A, COHORT_B], stdDiff: 0.21,
               byCohort: { '1': { count: 60, pct: 30 }, '2': { count: 80, pct: 40 } } }),
      ],
      config: { ...DEFAULT_TABLE1_CONFIG, pinTopK: { enabled: true, k: 2 } },
    }))
    const firstNonGroup = result.rows.filter(r => r.kind !== 'group').slice(0, 2)
    const labels = firstNonGroup.map(r => (r as { label: string }).label)
    expect(labels).toEqual(['big', 'medium'])
    const allLabels = result.rows.filter(r => r.kind !== 'group').map(r => (r as { label: string }).label)
    expect(new Set(allLabels).size).toBe(allLabels.length)
  })
})
