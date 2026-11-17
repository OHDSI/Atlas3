import { arrayToCsv, downloadCsv } from '@/utils/csv'
import { buildTable1, type BuildTable1Output } from '@/utils/characterization-table1'
import { computeBinaryStdDiff, DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'
import type {
  CharacterizationDefinition,
  DistributionStat,
  PrevalenceStat,
  Table1Config,
  Table1Filters,
  Table1Row,
} from '@/models/characterization.types'

export interface CharacterizationExportInput {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  cohorts: CharacterizationDefinition['cohorts']
  config: Table1Config
  // The same filters the table is showing, so an export matches the screen —
  // including the free-text search (#327).
  filters: Table1Filters
  cohortSizes: Record<string, number>
  selectedExecutionId: number | null
}

type CsvRow = Record<string, string | number | null>
type DataRow = Extract<Table1Row, { kind: 'binary' | 'continuous' }>

const OVERALL_LABEL = 'All'

function isOverall(key: string): boolean {
  return key === DEFAULT_STRATA_KEY || key === '0'
}

function strataEntries(input: CharacterizationExportInput): { key: string; name: string }[] {
  const names = new Map<string, string>()
  const add = (key: string, row: PrevalenceStat | DistributionStat) => {
    if (!names.has(key)) names.set(key, isOverall(key) ? OVERALL_LABEL : (row.strataNames?.[key] ?? key))
  }
  for (const row of input.prevalence) for (const key of Object.keys(row.pct)) add(key, row)
  for (const row of input.distribution) for (const key of Object.keys(row.avg)) add(key, row)
  return Array.from(names, ([key, name]) => ({ key, name }))
    .sort((a, b) => Number(isOverall(b.key)) - Number(isOverall(a.key)))
}

function only<T>(rec: Record<string, T> | undefined, key: string): Record<string, T> {
  const value = rec?.[key]
  return value === undefined ? {} : { [key]: value }
}

function projectPrevalence(
  row: PrevalenceStat,
  key: string,
  cohorts: CharacterizationExportInput['cohorts'],
): PrevalenceStat {
  const [first, second] = cohorts
  const stdDiff = row.stdDiffByStrata?.[key]
    ?? (isOverall(key) ? row.stdDiff : undefined)
    ?? (first && second
      ? computeBinaryStdDiff(row.pct[key]?.[String(first.id)], row.pct[key]?.[String(second.id)])
      : undefined)
  return { ...row, count: only(row.count, key), pct: only(row.pct, key), stdDiff }
}

function projectDistribution(row: DistributionStat, key: string): DistributionStat {
  return {
    ...row,
    count: row.count ? only(row.count, key) : undefined,
    avg: only(row.avg, key),
    stdDev: only(row.stdDev, key),
    min: only(row.min, key),
    p10: only(row.p10, key),
    p25: only(row.p25, key),
    median: only(row.median, key),
    p75: only(row.p75, key),
    p90: only(row.p90, key),
    max: only(row.max, key),
  }
}

function rowKey(row: DataRow): string {
  return `${row.kind}::${row.analysisId}::${row.covariateId}`
}

function dataRows(built: BuildTable1Output): DataRow[] {
  return built.rows.filter((row): row is DataRow => row.kind !== 'group')
}

function toCsvRow(row: DataRow, built: BuildTable1Output): CsvRow {
  const out: CsvRow = {
    kind: row.kind,
    analysisId: row.analysisId,
    analysisName: row.analysisName,
    covariateId: row.covariateId,
    covariateName: row.label,
    conceptId: row.conceptId,
  }
  for (const col of built.columns) {
    const cell = row.cells[col.cohortKey]
    if (cell === null || cell === undefined) {
      out[`${col.cohortKey}__primary`] = null
      out[`${col.cohortKey}__secondary`] = null
    } else if (row.kind === 'binary') {
      out[`${col.cohortKey}__primary`] = (cell as { count: number }).count
      out[`${col.cohortKey}__secondary`] = (cell as { pct: number }).pct
    } else {
      out[`${col.cohortKey}__primary`] = (cell as { primary: number }).primary
      out[`${col.cohortKey}__secondary`] = (cell as { secondary: number }).secondary
    }
  }
  out.stdDiff =
    built.includeStdDiff && row.kind === 'binary' && typeof row.stdDiff === 'number'
      ? row.stdDiff
      : null
  return out
}

export function buildCharacterizationExport(
  input: CharacterizationExportInput,
): { headers: { key: string; label: string }[]; rows: CsvRow[] } | null {
  const base = {
    prevalence: input.prevalence,
    distribution: input.distribution,
    cohorts: input.cohorts,
    config: input.config,
    filters: input.filters,
    cohortSizes: input.cohortSizes,
  }
  const built = buildTable1(base)
  const visible = dataRows(built)
  if (visible.length === 0) return null

  const strata = strataEntries(input)
  const strataNameByKey = new Map(strata.map(s => [s.key, s.name]))
  const stratifiedRows = !input.config.strataAsCols && strata.some(s => !isOverall(s.key))

  const headers: { key: string; label: string }[] = [{ key: 'kind', label: 'Type' }]
  if (stratifiedRows) {
    headers.push({ key: 'strataId', label: 'Strata ID' })
    headers.push({ key: 'strataName', label: 'Strata name' })
  }
  headers.push(
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'analysisName', label: 'Analysis' },
    { key: 'covariateId', label: 'Covariate ID' },
    { key: 'covariateName', label: 'Covariate' },
    { key: 'conceptId', label: 'Concept ID' },
  )
  for (const col of built.columns) {
    const strataLabel = col.strataKey !== undefined
      ? (strataNameByKey.get(col.strataKey) ?? col.strataLabel)
      : col.strataLabel
    const colLabel = strataLabel ? `${col.cohortName} · ${strataLabel}` : col.cohortName
    headers.push({ key: `${col.cohortKey}__primary`, label: `${colLabel} · primary` })
    headers.push({ key: `${col.cohortKey}__secondary`, label: `${colLabel} · secondary` })
  }
  if (built.includeStdDiff) {
    headers.push({ key: 'stdDiff', label: 'Std Diff' })
  }

  if (!stratifiedRows) {
    return { headers, rows: visible.map(row => toCsvRow(row, built)) }
  }

  // The results view keeps or drops a covariate on its Overall figures and then
  // shows it in every subgroup, so each subgroup exports the same covariates.
  const kept = new Set(visible.map(rowKey))
  const rows: CsvRow[] = []
  for (const stratum of strata) {
    const projected = buildTable1({
      ...base,
      filters: { ...input.filters, threshold: 0 },
      prevalence: input.prevalence
        .filter(row => row.pct[stratum.key] !== undefined)
        .map(row => projectPrevalence(row, stratum.key, input.cohorts)),
      distribution: input.distribution
        .filter(row => row.avg[stratum.key] !== undefined)
        .map(row => projectDistribution(row, stratum.key)),
    })
    for (const row of dataRows(projected)) {
      if (!kept.has(rowKey(row))) continue
      rows.push({
        ...toCsvRow(row, projected),
        strataId: isOverall(stratum.key) ? 0 : stratum.key,
        strataName: stratum.name,
      })
    }
  }
  return { headers, rows }
}

export function exportCharacterizationResults(input: CharacterizationExportInput): void {
  const result = buildCharacterizationExport(input)
  if (!result) return
  const csv = arrayToCsv(result.rows, result.headers)
  downloadCsv(`characterization-${input.selectedExecutionId ?? 'results'}.csv`, csv)
}
