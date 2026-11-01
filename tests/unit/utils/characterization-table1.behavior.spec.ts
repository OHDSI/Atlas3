import { describe, it, expect } from 'vitest'
import {
  buildTable1,
  computeStdDiffCI,
  deriveCohortSizes,
  type BuildTable1Input,
} from '@/utils/characterization-table1'
import {
  DEFAULT_TABLE1_CONFIG,
  DEFAULT_TABLE1_FILTERS,
  type DistributionStat,
  type LinkedCohort,
  type PrevalenceStat,
  type Table1Row,
} from '@/models/characterization.types'

type Nested = Record<string, Record<string, number>>

const A: LinkedCohort = { id: 1, name: 'A' }
const B: LinkedCohort = { id: 2, name: 'B' }

function prev(over: Partial<PrevalenceStat> & { covariateId: number; covariateName: string }): PrevalenceStat {
  return {
    analysisId: 1,
    analysisName: 'Analysis',
    conceptId: 0,
    cohorts: [A, B],
    strataNames: {},
    count: { overall: { '1': 10, '2': 20 } },
    pct: { overall: { '1': 10, '2': 20 } },
    ...over,
  }
}

function dist(over: Partial<DistributionStat> & { covariateId: number; covariateName: string }): DistributionStat {
  const empty = (): Nested => ({})
  return {
    analysisId: 1,
    analysisName: 'Analysis',
    conceptId: 0,
    cohorts: [A, B],
    strataNames: {},
    avg: empty(),
    stdDev: empty(),
    min: empty(),
    p10: empty(),
    p25: empty(),
    median: empty(),
    p75: empty(),
    p90: empty(),
    max: empty(),
    ...over,
  }
}

function input(over: Partial<BuildTable1Input> = {}): BuildTable1Input {
  return {
    prevalence: [],
    distribution: [],
    cohorts: [A, B],
    config: DEFAULT_TABLE1_CONFIG,
    filters: DEFAULT_TABLE1_FILTERS,
    ...over,
  }
}

const flat = { ...DEFAULT_TABLE1_CONFIG, groupByAnalysis: false }
const strataCols = { ...DEFAULT_TABLE1_CONFIG, strataAsCols: true }

type BinaryRow = Extract<Table1Row, { kind: 'binary' }>
type ContinuousRow = Extract<Table1Row, { kind: 'continuous' }>

const binaries = (rows: Table1Row[]) => rows.filter((r): r is BinaryRow => r.kind === 'binary')
const continuous = (rows: Table1Row[]) => rows.filter((r): r is ContinuousRow => r.kind === 'continuous')
const labels = (rows: Table1Row[]) => rows.map(r => r.label)

describe('computeStdDiffCI', () => {
  it('uses the Hmisc variance approximation with a 1.96 z multiplier', () => {
    const se = Math.sqrt((100 + 300) / (100 * 300) + (0.5 * 0.5) / (2 * 400))
    const ci = computeStdDiffCI(0.5, 100, 300)
    expect(ci?.lower).toBeCloseTo(0.5 - 1.96 * se, 12)
    expect(ci?.upper).toBeCloseTo(0.5 + 1.96 * se, 12)
  })

  it('accepts groups of exactly one person', () => {
    const se = Math.sqrt(2 + 0.04 / 4)
    expect(computeStdDiffCI(0.2, 1, 1)?.upper).toBeCloseTo(0.2 + 1.96 * se, 12)
  })

  it('returns null when either size is below one', () => {
    expect(computeStdDiffCI(0.2, 0.5, 100)).toBeNull()
    expect(computeStdDiffCI(0.2, 100, 0.5)).toBeNull()
  })

  it('returns null when the standard error overflows', () => {
    expect(computeStdDiffCI(1e200, 10, 10)).toBeNull()
  })
})

describe('deriveCohortSizes', () => {
  it('rounds the derived size to the nearest person', () => {
    const sizes = deriveCohortSizes({
      cohorts: [A],
      prevalence: [prev({ covariateId: 1, covariateName: 'x', count: { overall: { '1': 2 } }, pct: { overall: { '1': 30 } } })],
    })
    expect(sizes).toEqual({ '1': 7 })
  })

  it('keeps the largest size when a later row derives a smaller one', () => {
    const sizes = deriveCohortSizes({
      cohorts: [A],
      prevalence: [
        prev({ covariateId: 1, covariateName: 'x', count: { overall: { '1': 100 } }, pct: { overall: { '1': 50 } } }),
        prev({ covariateId: 2, covariateName: 'y', count: { overall: { '1': 10 } }, pct: { overall: { '1': 10 } } }),
      ],
    })
    expect(sizes).toEqual({ '1': 200 })
  })

  it('ignores a size that overflows to infinity', () => {
    const sizes = deriveCohortSizes({
      cohorts: [A],
      prevalence: [
        prev({ covariateId: 1, covariateName: 'x', count: { overall: { '1': 1 } }, pct: { overall: { '1': 5e-324 } } }),
        prev({ covariateId: 2, covariateName: 'y', count: { overall: { '1': 100 } }, pct: { overall: { '1': 50 } } }),
      ],
    })
    expect(sizes).toEqual({ '1': 200 })
  })

  it('tolerates a stratum present in pct but missing from count', () => {
    const sizes = deriveCohortSizes({
      cohorts: [A],
      prevalence: [
        prev({
          covariateId: 1,
          covariateName: 'x',
          count: { overall: { '1': 50 } },
          pct: { overall: { '1': 50 }, s1: { '1': 10 } },
        }),
      ],
    })
    expect(sizes).toEqual({ '1': 100 })
  })
})

describe('buildTable1 std-diff CI', () => {
  const ciConfig = { ...DEFAULT_TABLE1_CONFIG, showStdDiffCI: true }

  it('uses explicit cohort sizes over sizes derived from prevalence', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', stdDiff: 0.5 })],
      config: ciConfig,
      cohortSizes: { '1': 100, '2': 300 },
    }))
    expect(binaries(result.rows)[0]?.stdDiffCI).toEqual(computeStdDiffCI(0.5, 100, 300))
  })

  it('derives sizes from prevalence when none are given', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', stdDiff: 0.5 })],
      config: ciConfig,
    }))
    expect(binaries(result.rows)[0]?.stdDiffCI).toEqual(computeStdDiffCI(0.5, 100, 100))
  })

  it('leaves stdDiffCI unset when no cohort size is known', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', stdDiff: 0.5 })],
      config: ciConfig,
      cohortSizes: {},
    }))
    expect(binaries(result.rows)[0]).not.toHaveProperty('stdDiffCI')
  })

  it('does not compute a CI when strata are shown as columns', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', stdDiff: 0.5 })],
      config: { ...ciConfig, strataAsCols: true },
      cohortSizes: { '1': 100, '2': 100 },
    }))
    expect(binaries(result.rows)[0]?.stdDiffCI).toBeUndefined()
  })
})

describe('buildTable1 cells', () => {
  it('reads the only stratum of an unstratified row when there is no overall key', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { s1: { '1': 3, '2': 4 } },
        pct: { s1: { '1': 30, '2': 40 } },
      })],
    }))
    expect(binaries(result.rows)[0]?.cells).toEqual({ '1': { count: 3, pct: 30 }, '2': { count: 4, pct: 40 } })
  })

  it('nulls a binary cell missing either the count or the percent', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { overall: { '1': 3 } },
        pct: { overall: { '2': 40 } },
      })],
    }))
    expect(binaries(result.rows)[0]?.cells).toStrictEqual({ '1': null, '2': null })
  })

  it('nulls binary cells when the chosen stratum has percents but no counts', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', count: {}, pct: { overall: { '1': 4, '2': 5 } } })],
    }))
    expect(binaries(result.rows)[0]?.cells).toStrictEqual({ '1': null, '2': null })
  })

  it('nulls continuous cells for a row with no strata at all', () => {
    const result = buildTable1(input({
      distribution: [dist({ covariateId: 1, covariateName: 'age' })],
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({ '1': null, '2': null })
  })

  it('nulls a median-iqr cell missing the 25th percentile', () => {
    const result = buildTable1(input({
      distribution: [dist({
        covariateId: 1,
        covariateName: 'age',
        avg: { overall: { '1': 1 } },
        median: { overall: { '1': 50 } },
        p75: { overall: { '1': 60 } },
      })],
      config: { ...DEFAULT_TABLE1_CONFIG, continuousFormat: 'median-iqr' },
      cohorts: [A],
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({ '1': null })
  })

  it('nulls a median-iqr cell missing the median', () => {
    const result = buildTable1(input({
      distribution: [dist({
        covariateId: 1,
        covariateName: 'age',
        avg: { overall: { '1': 1 } },
        p25: { overall: { '1': 40 } },
        p75: { overall: { '1': 60 } },
      })],
      config: { ...DEFAULT_TABLE1_CONFIG, continuousFormat: 'median-iqr' },
      cohorts: [A],
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({ '1': null })
  })

  it('nulls a mean-sd cell missing the mean', () => {
    const result = buildTable1(input({
      distribution: [dist({
        covariateId: 1,
        covariateName: 'age',
        avg: { overall: { '2': 1 } },
        stdDev: { overall: { '1': 5 } },
      })],
      cohorts: [A],
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({ '1': null })
  })
})

describe('buildTable1 strata as columns', () => {
  it('labels the overall stratum column All and others by their key', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { overall: { '1': 1 }, s1: { '1': 1 } },
        pct: { overall: { '1': 1 }, s1: { '1': 1 } },
      })],
      cohorts: [A],
      config: strataCols,
    }))
    expect(result.columns).toEqual([
      { cohortKey: '1::overall', cohortId: 1, cohortName: 'A', strataKey: 'overall', strataLabel: 'All' },
      { cohortKey: '1::s1', cohortId: 1, cohortName: 'A', strataKey: 's1', strataLabel: 's1' },
    ])
  })

  it('merges strata rows of one covariate into one row with a cell per cohort and stratum', () => {
    const overall = prev({
      analysisId: 3,
      analysisName: 'Conditions',
      covariateId: 7,
      conceptId: 70,
      covariateName: 'Diabetes',
      stdDiff: 0.25,
      count: { overall: { '1': 10 } },
      pct: { overall: { '1': 5 } },
    })
    const overallB = prev({
      analysisId: 3,
      analysisName: 'Conditions',
      covariateId: 7,
      covariateName: 'Diabetes',
      count: { overall: { '2': 20 } },
      pct: { overall: { '2': 8 } },
    })
    const stratum = prev({
      analysisId: 3,
      analysisName: 'Conditions',
      covariateId: 7,
      covariateName: 'Diabetes',
      count: { s1: { '1': 4, '2': 6 } },
      pct: { s1: { '1': 2 }, s2: { '1': 3 } },
    })
    const other = prev({
      analysisId: 3,
      analysisName: 'Conditions',
      covariateId: 8,
      covariateName: 'Hypertension',
      count: { overall: { '1': 1, '2': 1 } },
      pct: { overall: { '1': 1, '2': 1 } },
    })
    const before = structuredClone(overall)

    const result = buildTable1(input({
      prevalence: [overall, overallB, stratum, other],
      config: strataCols,
    }))

    const rows = binaries(result.rows)
    expect(labels(rows)).toEqual(['Diabetes', 'Hypertension'])
    const [merged] = rows
    expect(merged?.kind).toBe('binary')
    expect(merged?.analysisId).toBe(3)
    expect(merged?.analysisName).toBe('Conditions')
    expect(merged?.covariateId).toBe(7)
    expect(merged?.conceptId).toBe(70)
    expect(merged?.stdDiff).toBe(0.25)
    expect(merged?.cells).toStrictEqual({
      '1::overall': { count: 10, pct: 5 },
      '1::s1': { count: 4, pct: 2 },
      '1::s2': null,
      '2::overall': { count: 20, pct: 8 },
      '2::s1': null,
      '2::s2': null,
    })
    expect(overall).toEqual(before)
  })

  it('nulls continuous cells for strata the distribution row lacks', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { s1: { '1': 1 } },
        pct: { s1: { '1': 1 } },
      })],
      distribution: [dist({
        covariateId: 2,
        covariateName: 'age',
        avg: { overall: { '1': 60 } },
        stdDev: { overall: { '1': 5 } },
      })],
      cohorts: [A],
      config: strataCols,
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({
      '1::overall': { primary: 60, secondary: 5 },
      '1::s1': null,
    })
  })

  it('nulls median-iqr cells for strata the distribution row lacks', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { s1: { '1': 1 } },
        pct: { s1: { '1': 1 } },
      })],
      distribution: [dist({
        covariateId: 2,
        covariateName: 'age',
        avg: { overall: { '1': 60 } },
        median: { overall: { '1': 60 } },
        p25: { overall: { '1': 50 } },
        p75: { overall: { '1': 72 } },
      })],
      cohorts: [A],
      config: { ...strataCols, continuousFormat: 'median-iqr' },
    }))
    expect(continuous(result.rows)[0]?.cells).toStrictEqual({
      '1::overall': { primary: 60, secondary: 22 },
      '1::s1': null,
    })
  })
})

describe('buildTable1 filters', () => {
  it('keeps rows with no populated cell when the threshold is zero', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', count: {}, pct: {} })],
      config: flat,
    }))
    expect(labels(result.rows)).toEqual(['x'])
  })

  it('keeps a row whose percent equals the threshold exactly', () => {
    const result = buildTable1(input({
      prevalence: [prev({ covariateId: 1, covariateName: 'x', pct: { overall: { '1': 5, '2': 1 } } })],
      config: flat,
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 5 },
    }))
    expect(labels(result.rows)).toEqual(['x'])
  })

  it('does not let an empty cell clear the threshold', () => {
    const result = buildTable1(input({
      prevalence: [prev({
        covariateId: 1,
        covariateName: 'x',
        count: { overall: { '2': 1 } },
        pct: { overall: { '2': 0.5 } },
      })],
      config: flat,
      filters: { ...DEFAULT_TABLE1_FILTERS, threshold: 1 },
    }))
    expect(result.rows).toEqual([])
  })

  it('drops continuous rows outside the selected analyses', () => {
    const result = buildTable1(input({
      distribution: [
        dist({ analysisId: 1, covariateId: 1, covariateName: 'age' }),
        dist({ analysisId: 2, covariateId: 2, covariateName: 'bmi' }),
      ],
      config: flat,
      filters: { ...DEFAULT_TABLE1_FILTERS, selectedAnalysisIds: [2] },
    }))
    expect(labels(result.rows)).toEqual(['bmi'])
  })

  it('filters continuous rows by domain, treating a missing domain as unmatched', () => {
    const result = buildTable1(input({
      distribution: [
        dist({ covariateId: 1, covariateName: 'age', domainId: 'Demographics' }),
        dist({ covariateId: 2, covariateName: 'bmi', domainId: 'Measurement' }),
        dist({ covariateId: 3, covariateName: 'none' }),
      ],
      config: flat,
      filters: { ...DEFAULT_TABLE1_FILTERS, selectedDomains: ['Measurement'] },
    }))
    expect(labels(result.rows)).toEqual(['bmi'])
  })
})

describe('buildTable1 ordering', () => {
  it('sorts ungrouped binary and continuous rows together by label', () => {
    const result = buildTable1(input({
      prevalence: [
        prev({ covariateId: 1, covariateName: 'zinc' }),
        prev({ covariateId: 2, covariateName: 'apple' }),
      ],
      distribution: [dist({ covariateId: 3, covariateName: 'mango' })],
      config: flat,
    }))
    expect(labels(result.rows)).toEqual(['apple', 'mango', 'zinc'])
  })

  it('sorts rows by label inside each analysis group', () => {
    const result = buildTable1(input({
      prevalence: [
        prev({ covariateId: 1, covariateName: 'zinc' }),
        prev({ covariateId: 2, covariateName: 'apple' }),
      ],
    }))
    expect(result.rows.map(r => [r.kind, r.label])).toEqual([
      ['group', 'Analysis'],
      ['binary', 'apple'],
      ['binary', 'zinc'],
    ])
  })

  it('orders groups by the domain of their rows', () => {
    const group = (analysisId: number, domainId: string) =>
      prev({ analysisId, analysisName: `Group ${analysisId}`, covariateId: analysisId, covariateName: 'x', domainId })
    const result = buildTable1(input({
      prevalence: [
        group(1, 'Visit'),
        group(2, 'Device'),
        group(3, 'Measurement'),
        group(4, 'Procedure'),
        group(5, 'Drug'),
        group(6, 'Condition'),
        group(7, 'Observation'),
        group(8, 'Demographics'),
      ],
    }))
    expect(result.rows.filter(r => r.kind === 'group').map(r => r.analysisId)).toEqual([8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('uses the first row with a known domain to place a group', () => {
    const result = buildTable1(input({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'First', covariateId: 1, covariateName: 'a', domainId: 'Condition' }),
        prev({ analysisId: 2, analysisName: 'Second', covariateId: 2, covariateName: 'a' }),
        prev({ analysisId: 2, analysisName: 'Second', covariateId: 3, covariateName: 'b', domainId: 'Unlisted' }),
        prev({ analysisId: 2, analysisName: 'Second', covariateId: 4, covariateName: 'c', domainId: 'Demographics' }),
      ],
    }))
    expect(result.rows.filter(r => r.kind === 'group').map(r => r.label)).toEqual(['Second', 'First'])
  })

  it('falls back to analysis-name keywords when rows carry no domain', () => {
    const group = (analysisId: number, analysisName: string) =>
      prev({ analysisId, analysisName, covariateId: analysisId, covariateName: 'x' })
    const result = buildTable1(input({
      prevalence: [
        group(1, 'Something else'),
        group(2, 'Drug Exposure'),
        group(3, 'Condition Occurrence'),
        group(4, 'Observation Period'),
        group(5, 'Gender'),
      ],
    }))
    expect(result.rows.filter(r => r.kind === 'group').map(r => r.label)).toEqual([
      'Gender',
      'Observation Period',
      'Condition Occurrence',
      'Drug Exposure',
      'Something else',
    ])
  })

  it.each(['Demographics', 'Age group', 'Gender'])('places a %s analysis first by name', name => {
    const result = buildTable1(input({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Observation', covariateId: 1, covariateName: 'x' }),
        prev({ analysisId: 2, analysisName: name, covariateId: 2, covariateName: 'x' }),
      ],
    }))
    expect(result.rows.find(r => r.kind === 'group')?.label).toBe(name)
  })
})

describe('buildTable1 pin top-K', () => {
  const pin = (k: number, enabled = true) => ({ ...flat, pinTopK: { enabled, k } })
  const rows = () => [
    prev({ covariateId: 11, covariateName: 'a-low', stdDiff: 0.05 }),
    prev({ covariateId: 12, covariateName: 'b-high', stdDiff: -0.9 }),
    prev({ covariateId: 14, covariateName: 'c-tie', stdDiff: 0.3 }),
    prev({ covariateId: 13, covariateName: 'd-tie', stdDiff: -0.3 }),
    prev({ covariateId: 15, covariateName: 'e-none' }),
  ]

  it('moves the K largest absolute std diffs to the top, breaking ties by covariate id', () => {
    const result = buildTable1(input({
      prevalence: rows(),
      distribution: [dist({ covariateId: 12, covariateName: 'f-cont' })],
      config: pin(3),
    }))
    expect(labels(result.rows)).toEqual(['b-high', 'd-tie', 'c-tie', 'a-low', 'e-none', 'f-cont'])
  })

  it('keeps label order when pinning is disabled', () => {
    const result = buildTable1(input({ prevalence: rows(), config: pin(3, false) }))
    expect(labels(result.rows)).toEqual(['a-low', 'b-high', 'c-tie', 'd-tie', 'e-none'])
  })

  it('keeps label order when K is zero', () => {
    const result = buildTable1(input({ prevalence: rows(), config: pin(0) }))
    expect(labels(result.rows)).toEqual(['a-low', 'b-high', 'c-tie', 'd-tie', 'e-none'])
  })

  it('never pins a row without a std diff', () => {
    const result = buildTable1(input({
      prevalence: [
        prev({ covariateId: 1, covariateName: 'z-none' }),
        prev({ covariateId: 2, covariateName: 'a-some', stdDiff: 0.9 }),
      ],
      config: pin(1),
    }))
    expect(labels(result.rows)).toEqual(['a-some', 'z-none'])
  })

  it('pins ahead of group headers, which stay in place for the remaining rows', () => {
    const result = buildTable1(input({
      prevalence: [
        prev({ analysisId: 1, analysisName: 'Gender', covariateId: 1, covariateName: 'female', stdDiff: 0.1 }),
        prev({ analysisId: 1, analysisName: 'Gender', covariateId: 2, covariateName: 'male', stdDiff: 0.2 }),
        prev({ analysisId: 2, analysisName: 'Condition', covariateId: 3, covariateName: 'htn', stdDiff: 0.8 }),
        prev({ analysisId: 2, analysisName: 'Condition', covariateId: 4, covariateName: 'dm', stdDiff: 0.01 }),
      ],
      config: { ...DEFAULT_TABLE1_CONFIG, pinTopK: { enabled: true, k: 1 } },
    }))
    expect(result.rows.map(r => [r.kind, r.label])).toEqual([
      ['binary', 'htn'],
      ['group', 'Gender'],
      ['binary', 'female'],
      ['binary', 'male'],
      ['group', 'Condition'],
      ['binary', 'dm'],
    ])
  })
})
