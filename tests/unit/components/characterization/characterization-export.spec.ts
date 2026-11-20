import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildCharacterizationExport,
  exportCharacterizationResults,
  type CharacterizationExportInput,
} from '@/components/characterization/characterization-export'
import {
  DEFAULT_TABLE1_CONFIG,
  DEFAULT_TABLE1_FILTERS,
  type DistributionStat,
  type LinkedCohort,
  type PrevalenceStat,
} from '@/models/characterization.types'
import { downloadCsv } from '@/utils/csv'

vi.mock('@/utils/csv', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/csv')>()
  return { ...actual, downloadCsv: vi.fn() }
})

const COHORT_A: LinkedCohort = { id: 1, name: 'Metformin' }
const COHORT_B: LinkedCohort = { id: 2, name: 'Sulfonylurea' }

type Cells = Record<string, Record<string, { count: number; pct: number }>>

function prev(covariateId: number, name: string, byStratum: Cells, extra: Partial<PrevalenceStat> = {}): PrevalenceStat {
  const count: Record<string, Record<string, number>> = {}
  const pct: Record<string, Record<string, number>> = {}
  for (const [stratum, byCohort] of Object.entries(byStratum)) {
    count[stratum] = {}
    pct[stratum] = {}
    for (const [cohortId, v] of Object.entries(byCohort)) {
      count[stratum]![cohortId] = v.count
      pct[stratum]![cohortId] = v.pct
    }
  }
  return {
    analysisId: 10,
    analysisName: 'Gender',
    covariateId,
    covariateName: name,
    conceptId: covariateId,
    cohorts: [COHORT_A, COHORT_B],
    strataNames: { overall: 'overall', '5': 'Age over 65' },
    count,
    pct,
    ...extra,
  }
}

function dist(byStratum: Record<string, Record<string, { avg: number; stdDev: number }>>): DistributionStat {
  const avg: Record<string, Record<string, number>> = {}
  const stdDev: Record<string, Record<string, number>> = {}
  for (const [stratum, byCohort] of Object.entries(byStratum)) {
    avg[stratum] = {}
    stdDev[stratum] = {}
    for (const [cohortId, v] of Object.entries(byCohort)) {
      avg[stratum]![cohortId] = v.avg
      stdDev[stratum]![cohortId] = v.stdDev
    }
  }
  return {
    analysisId: 20,
    analysisName: 'Age',
    covariateId: 99,
    covariateName: 'age',
    conceptId: 0,
    cohorts: [COHORT_A, COHORT_B],
    strataNames: { overall: 'overall', '5': 'Age over 65' },
    avg,
    stdDev,
    min: {}, p10: {}, p25: {}, median: {}, p75: {}, p90: {}, max: {},
  }
}

function input(overrides: Partial<CharacterizationExportInput> = {}): CharacterizationExportInput {
  return {
    prevalence: [
      prev(8507, 'gender = MALE', {
        overall: { '1': { count: 40, pct: 40 }, '2': { count: 30, pct: 30 } },
        '5': { '1': { count: 12, pct: 48 }, '2': { count: 6, pct: 24 } },
      }, { stdDiffByStrata: { '5': 0.5 } }),
      prev(8532, 'gender = FEMALE', {
        overall: { '1': { count: 60, pct: 60 }, '2': { count: 70, pct: 70 } },
        '5': { '1': { count: 13, pct: 52 }, '2': { count: 19, pct: 76 } },
      }),
    ],
    distribution: [
      dist({
        overall: { '1': { avg: 55, stdDev: 9 }, '2': { avg: 58, stdDev: 8 } },
        '5': { '1': { avg: 71, stdDev: 4 }, '2': { avg: 72, stdDev: 3 } },
      }),
    ],
    cohorts: [COHORT_A, COHORT_B],
    config: { ...DEFAULT_TABLE1_CONFIG },
    filters: { ...DEFAULT_TABLE1_FILTERS },
    cohortSizes: {},
    selectedExecutionId: 7,
    ...overrides,
  }
}

describe('buildCharacterizationExport', () => {
  it('exports a row per subgroup with the subgroup id and name', () => {
    const result = buildCharacterizationExport(input())!
    const labels = result.headers.map(h => h.label)
    expect(labels.slice(0, 3)).toEqual(['Type', 'Strata ID', 'Strata name'])

    const male = result.rows.filter(r => r.covariateId === 8507)
    expect(male.map(r => [r.strataId, r.strataName, r['1__primary'], r['1__secondary']])).toEqual([
      [0, 'All', 40, 40],
      ['5', 'Age over 65', 12, 48],
    ])
    expect(male[1]!.stdDiff).toBe(0.5)

    const age = result.rows.filter(r => r.kind === 'continuous')
    expect(age.map(r => [r.strataName, r['1__primary'], r['2__secondary']])).toEqual([
      ['All', 55, 8],
      ['Age over 65', 71, 3],
    ])
  })

  it('computes the subgroup std diff when the results do not carry one', () => {
    const result = buildCharacterizationExport(input())!
    const female = result.rows.find(r => r.covariateId === 8532 && r.strataId === '5')!
    expect(typeof female.stdDiff).toBe('number')
    expect(female.stdDiff).toBeLessThan(0)
  })

  it('keeps the covariates the on-screen threshold keeps, in every subgroup', () => {
    const result = buildCharacterizationExport(input({
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 50 },
    }))!
    const binary = result.rows.filter(r => r.kind === 'binary')
    expect(binary.map(r => [r.covariateId, r.strataId])).toEqual([
      [8532, 0],
      [8532, '5'],
    ])
  })

  it('leaves out the subgroup columns when the results are not stratified', () => {
    const result = buildCharacterizationExport(input({
      prevalence: [prev(8507, 'gender = MALE', {
        overall: { '1': { count: 40, pct: 40 }, '2': { count: 30, pct: 30 } },
      })],
      distribution: [],
    }))!
    expect(result.headers.map(h => h.key)).not.toContain('strataId')
    expect(result.rows).toHaveLength(1)
  })

  it('names subgroup columns after the subgroup when subgroups are shown as columns', () => {
    const result = buildCharacterizationExport(input({
      config: { ...DEFAULT_TABLE1_CONFIG, strataAsCols: true },
    }))!
    const labels = result.headers.map(h => h.label)
    expect(labels).not.toContain('Strata ID')
    expect(labels).toContain('Metformin · Age over 65 · primary')
    expect(labels).toContain('Metformin · All · primary')
    const male = result.rows.filter(r => r.covariateId === 8507)
    expect(male).toHaveLength(1)
    expect(male[0]!['1::5__primary']).toBe(12)
  })
})

describe('exportCharacterizationResults', () => {
  beforeEach(() => vi.mocked(downloadCsv).mockClear())

  it('writes the subgroup rows into the downloaded csv', () => {
    exportCharacterizationResults(input())
    const [filename, csv] = vi.mocked(downloadCsv).mock.calls[0]!
    expect(filename).toBe('characterization-7.csv')
    expect(csv).toContain('Type,Strata ID,Strata name,Analysis ID')
    expect(csv).toContain('binary,5,Age over 65,10,Gender,8507,gender = MALE')
  })

  it('downloads nothing when no rows survive the filters', () => {
    exportCharacterizationResults(input({ prevalence: [], distribution: [] }))
    expect(downloadCsv).not.toHaveBeenCalled()
  })
})
