import type {
  DistributionStat,
  LinkedCohort,
  PrevalenceStat,
  Table1CohortColumn,
  Table1Config,
  Table1Filters,
  Table1Row,
} from '@/models/characterization.types'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'

export interface BuildTable1Input {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: LinkedCohort[]
  config: Table1Config
  filters: Table1Filters
  // Optional override for cohort sizes (cohortId → N). When provided these
  // are used for the SMD CI; otherwise sizes are derived from prevalence rows.
  cohortSizes?: Record<string, number>
}

export interface BuildTable1Output {
  rows: Table1Row[]
  columns: Table1CohortColumn[]
  includeStdDiff: boolean
}

export function buildTable1(input: BuildTable1Input): BuildTable1Output {
  const columns = buildColumns(input)
  const includeStdDiff =
    input.cohorts.length === 2 && input.config.showStdDiff && !input.config.strataAsCols
  const includeStdDiffCI = includeStdDiff && input.config.showStdDiffCI

  const binaryRows = mapPrevalenceRows(input)
  const continuousRows = mapDistributionRows(input)

  if (includeStdDiffCI) {
    const sizes = input.cohortSizes ?? deriveCohortSizes(input)
    const c1 = input.cohorts[0]
    const c2 = input.cohorts[1]
    if (c1 && c2) {
      const n1 = sizes[String(c1.id)] ?? 0
      const n2 = sizes[String(c2.id)] ?? 0
      for (const row of binaryRows) {
        if (typeof row.stdDiff === 'number') {
          const ci = computeStdDiffCI(row.stdDiff, n1, n2)
          if (ci) row.stdDiffCI = ci
        }
      }
    }
  }

  const filteredBinary = binaryRows.filter(r => keepBinary(r, input))
  const filteredContinuous = continuousRows.filter(r => keepContinuous(r, input))

  const ordered = orderAndGroup(filteredBinary, filteredContinuous, input.config)

  return { rows: ordered, columns, includeStdDiff }
}

// Derive per-cohort N from prevalence rows: pick the largest valid count/(pct/100)
// observed across rows for each cohort. The "largest" choice is robust against
// rows where pct is rounded down or where a covariate is rare; the maximum
// closely approximates the true cohort size.
export function deriveCohortSizes(
  input: Pick<BuildTable1Input, 'prevalence' | 'cohorts'>,
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const cohort of input.cohorts) {
    let best = 0
    const idStr = String(cohort.id)
    for (const row of input.prevalence) {
      for (const stratumKey of Object.keys(row.pct)) {
        const pct = row.pct[stratumKey]?.[idStr]
        const cnt = row.count[stratumKey]?.[idStr]
        if (typeof pct !== 'number' || typeof cnt !== 'number') continue
        if (pct <= 0) continue
        const derived = cnt / (pct / 100)
        if (Number.isFinite(derived) && derived > best) best = derived
      }
    }
    if (best > 0) out[idStr] = Math.round(best)
  }
  return out
}

// Standard SMD variance approximation used by Hmisc / cobalt:
//   Var(SMD) ≈ (n1 + n2) / (n1 * n2) + SMD^2 / (2 * (n1 + n2))
// Returns null when sizes are missing or non-positive.
export function computeStdDiffCI(
  smd: number,
  n1: number,
  n2: number,
): { lower: number; upper: number } | null {
  if (!Number.isFinite(smd)) return null
  if (n1 < 1 || n2 < 1) return null
  const variance = (n1 + n2) / (n1 * n2) + (smd * smd) / (2 * (n1 + n2))
  const se = Math.sqrt(variance)
  if (!Number.isFinite(se)) return null
  return { lower: smd - 1.96 * se, upper: smd + 1.96 * se }
}

function buildColumns(input: BuildTable1Input): Table1CohortColumn[] {
  const cols: Table1CohortColumn[] = []
  if (!input.config.strataAsCols) {
    for (const c of input.cohorts) {
      cols.push({ cohortKey: String(c.id), cohortId: c.id, cohortName: c.name })
    }
    return cols
  }
  const strataKeys = collectStrataKeys(input)
  for (const c of input.cohorts) {
    for (const k of strataKeys) {
      cols.push({
        cohortKey: `${c.id}::${k}`,
        cohortId: c.id,
        cohortName: c.name,
        strataKey: k,
        strataLabel: k === DEFAULT_STRATA_KEY ? 'All' : k,
      })
    }
  }
  return cols
}

function collectStrataKeys(input: BuildTable1Input): string[] {
  const seen = new Set<string>()
  const ordered: string[] = []
  function add(k: string) {
    if (!seen.has(k)) {
      seen.add(k)
      ordered.push(k)
    }
  }
  add(DEFAULT_STRATA_KEY)
  for (const row of input.prevalence) {
    for (const k of Object.keys(row.pct)) add(k)
  }
  for (const row of input.distribution) {
    for (const k of Object.keys(row.avg)) add(k)
  }
  return ordered
}

function pickStratumKey(rec: Record<string, Record<string, number>>): string | null {
  const keys = Object.keys(rec)
  if (keys.length === 0) return null
  return keys.includes(DEFAULT_STRATA_KEY) ? DEFAULT_STRATA_KEY : (keys[0] ?? null)
}

function mapPrevalenceRows(input: BuildTable1Input): Extract<Table1Row, { kind: 'binary' }>[] {
  const out: Extract<Table1Row, { kind: 'binary' }>[] = []
  if (input.config.strataAsCols) {
    const strataKeys = collectStrataKeys(input)
    const merged = mergeByCovariate(input.prevalence)
    for (const m of merged) {
      const cells: Record<string, { count: number; pct: number } | null> = {}
      for (const c of input.cohorts) {
        for (const k of strataKeys) {
          const cellKey = `${c.id}::${k}`
          const cnt = m.count[k]?.[String(c.id)]
          const pct = m.pct[k]?.[String(c.id)]
          cells[cellKey] =
            typeof cnt === 'number' && typeof pct === 'number' ? { count: cnt, pct } : null
        }
      }
      out.push({
        kind: 'binary',
        analysisId: m.analysisId,
        analysisName: m.analysisName,
        covariateId: m.covariateId,
        conceptId: m.conceptId,
        label: m.covariateName,
        cells,
        stdDiff: m.stdDiff,
        _source: m,
      })
    }
    return out
  }
  for (const row of input.prevalence) {
    const sKey = pickStratumKey(row.pct)
    const cells: Record<string, { count: number; pct: number } | null> = {}
    for (const c of input.cohorts) {
      const cnt = sKey ? row.count[sKey]?.[String(c.id)] : undefined
      const pct = sKey ? row.pct[sKey]?.[String(c.id)] : undefined
      cells[String(c.id)] =
        typeof cnt === 'number' && typeof pct === 'number' ? { count: cnt, pct } : null
    }
    out.push({
      kind: 'binary',
      analysisId: row.analysisId,
      analysisName: row.analysisName,
      covariateId: row.covariateId,
      conceptId: row.conceptId,
      label: row.covariateName,
      cells,
      stdDiff: row.stdDiff,
      _source: row,
    })
  }
  return out
}

function mergeByCovariate(rows: PrevalenceStat[]): PrevalenceStat[] {
  const map = new Map<string, PrevalenceStat>()
  for (const r of rows) {
    const key = `${r.analysisId}::${r.covariateId}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, structuredClone(r))
      continue
    }
    for (const k of Object.keys(r.count)) {
      existing.count[k] = { ...existing.count[k], ...r.count[k] }
    }
    for (const k of Object.keys(r.pct)) {
      existing.pct[k] = { ...existing.pct[k], ...r.pct[k] }
    }
  }
  return Array.from(map.values())
}

function mapDistributionRows(
  input: BuildTable1Input
): Extract<Table1Row, { kind: 'continuous' }>[] {
  const out: Extract<Table1Row, { kind: 'continuous' }>[] = []
  const strataKeys = input.config.strataAsCols ? collectStrataKeys(input) : null
  for (const row of input.distribution) {
    const sKey = pickStratumKey(row.avg)
    const cells: Record<string, { primary: number; secondary: number } | null> = {}
    for (const c of input.cohorts) {
      const idStr = String(c.id)
      if (strataKeys) {
        for (const k of strataKeys) {
          const key = `${c.id}::${k}`
          cells[key] = formatContinuousCell(row, k, idStr, input.config.continuousFormat)
        }
      } else if (sKey) {
        cells[idStr] = formatContinuousCell(row, sKey, idStr, input.config.continuousFormat)
      } else {
        cells[idStr] = null
      }
    }
    out.push({
      kind: 'continuous',
      analysisId: row.analysisId,
      analysisName: row.analysisName,
      covariateId: row.covariateId,
      conceptId: row.conceptId,
      label: row.covariateName,
      stat: input.config.continuousFormat,
      cells,
      _source: row,
    })
  }
  return out
}

function formatContinuousCell(
  row: DistributionStat,
  strataKey: string,
  cohortIdStr: string,
  fmt: 'mean-sd' | 'median-iqr'
): { primary: number; secondary: number } | null {
  if (fmt === 'mean-sd') {
    const a = row.avg[strataKey]?.[cohortIdStr]
    const s = row.stdDev[strataKey]?.[cohortIdStr]
    if (typeof a === 'number' && typeof s === 'number') return { primary: a, secondary: s }
    return null
  }
  const m = row.median[strataKey]?.[cohortIdStr]
  const p25 = row.p25[strataKey]?.[cohortIdStr]
  const p75 = row.p75[strataKey]?.[cohortIdStr]
  if (typeof m === 'number' && typeof p25 === 'number' && typeof p75 === 'number') {
    return { primary: m, secondary: p75 - p25 }
  }
  return null
}

function keepBinary(row: Extract<Table1Row, { kind: 'binary' }>, input: BuildTable1Input): boolean {
  if (
    input.filters.selectedAnalysisIds.length > 0 &&
    !input.filters.selectedAnalysisIds.includes(row.analysisId)
  ) {
    return false
  }
  const domain = row._source.domainId ?? ''
  if (input.filters.selectedDomains.length > 0 && !input.filters.selectedDomains.includes(domain)) {
    return false
  }
  if (input.filters.threshold > 0) {
    const cleared = Object.values(row.cells).some(
      c => c !== null && c.pct >= input.filters.threshold
    )
    if (!cleared) return false
  }
  if (
    input.filters.selectedCohortId !== null &&
    !row._source.cohorts.some(c => c.id === input.filters.selectedCohortId)
  ) {
    return false
  }
  return true
}

// keepContinuous deliberately skips threshold (a prevalence percent — meaningless for
// continuous covariates) and selectedCohortId (continuous rows always show all cohorts).
function keepContinuous(
  row: Extract<Table1Row, { kind: 'continuous' }>,
  input: BuildTable1Input
): boolean {
  if (
    input.filters.selectedAnalysisIds.length > 0 &&
    !input.filters.selectedAnalysisIds.includes(row.analysisId)
  ) {
    return false
  }
  const domain = row._source.domainId ?? ''
  if (input.filters.selectedDomains.length > 0 && !input.filters.selectedDomains.includes(domain)) {
    return false
  }
  return true
}

function orderAndGroup(
  binary: Extract<Table1Row, { kind: 'binary' }>[],
  continuous: Extract<Table1Row, { kind: 'continuous' }>[],
  config: Table1Config
): Table1Row[] {
  const all: (
    | Extract<Table1Row, { kind: 'binary' }>
    | Extract<Table1Row, { kind: 'continuous' }>
  )[] = [...binary, ...continuous]

  if (!config.groupByAnalysis) {
    all.sort((a, b) => a.label.localeCompare(b.label))
    return applyPin(all, config)
  }

  const groups = new Map<
    number,
    {
      name: string
      rows: (Extract<Table1Row, { kind: 'binary' }> | Extract<Table1Row, { kind: 'continuous' }>)[]
    }
  >()
  for (const r of all) {
    let g = groups.get(r.analysisId)
    if (!g) {
      g = { name: r.analysisName, rows: [] }
      groups.set(r.analysisId, g)
    }
    g.rows.push(r)
  }

  const out: Table1Row[] = []
  for (const [analysisId, g] of groups) {
    g.rows.sort((a, b) => a.label.localeCompare(b.label))
    out.push({ kind: 'group', analysisId, label: g.name })
    for (const r of g.rows) out.push(r)
  }
  return applyPin(out, config)
}

function applyPin(rows: Table1Row[], config: Table1Config): Table1Row[] {
  if (!config.pinTopK.enabled || config.pinTopK.k <= 0) return rows
  const ranked = rows
    .filter(
      (r): r is Extract<Table1Row, { kind: 'binary' }> =>
        r.kind === 'binary' && typeof r.stdDiff === 'number'
    )
    .slice()
    .sort((a, b) => Math.abs(b.stdDiff!) - Math.abs(a.stdDiff!) || a.covariateId - b.covariateId)
    .slice(0, config.pinTopK.k)
  if (ranked.length === 0) return rows
  const pinnedKeys = new Set(ranked.map(r => `${r.analysisId}::${r.covariateId}`))
  const remaining = rows.filter(r =>
    r.kind !== 'binary' || !pinnedKeys.has(`${r.analysisId}::${r.covariateId}`),
  )
  return [...ranked, ...remaining]
}
