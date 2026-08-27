import { arrayToCsv, downloadCsv } from '@/utils/csv'
import { buildTable1 } from '@/utils/characterization-table1'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import type { PrevalenceStat } from '@/models/characterization-results.types'

export function exportCharacterizationResults(input: {
  prevalence: PrevalenceStat[]
  distribution: PrevalenceStat[]
  cohorts: CharacterizationDefinition['cohorts']
  config: { showStdDiffCI: boolean }
  filters: {
    threshold: number
    selectedAnalysisIds: number[]
    selectedDomains: string[]
    selectedCohortId: number | null
  }
  cohortSizes: Record<string, number>
  selectedExecutionId: number | null
}): void {
  const built = buildTable1({
    prevalence: input.prevalence,
    distribution: input.distribution,
    cohorts: input.cohorts,
    config: input.config,
    filters: input.filters,
    cohortSizes: input.cohortSizes,
  })
  if (built.rows.length === 0) return

  const headers: { key: string; label: string }[] = [
    { key: 'kind', label: 'Type' },
    { key: 'analysisId', label: 'Analysis ID' },
    { key: 'analysisName', label: 'Analysis' },
    { key: 'covariateId', label: 'Covariate ID' },
    { key: 'covariateName', label: 'Covariate' },
    { key: 'conceptId', label: 'Concept ID' },
  ]
  for (const col of built.columns) {
    const colLabel = col.strataLabel
      ? `${col.cohortName} · ${col.strataLabel}`
      : col.cohortName
    headers.push({ key: `${col.cohortKey}__primary`, label: `${colLabel} · primary` })
    headers.push({ key: `${col.cohortKey}__secondary`, label: `${colLabel} · secondary` })
  }
  if (built.includeStdDiff) {
    headers.push({ key: 'stdDiff', label: 'Std Diff' })
  }

  const rows: Array<Record<string, string | number | null>> = []
  for (const row of built.rows) {
    if (row.kind === 'group') continue
    const out: Record<string, string | number | null> = {
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
    if (built.includeStdDiff && row.kind === 'binary' && typeof row.stdDiff === 'number') {
      out.stdDiff = row.stdDiff
    } else {
      out.stdDiff = null
    }
    rows.push(out)
  }

  const csv = arrayToCsv(rows, headers)
  downloadCsv(`characterization-${input.selectedExecutionId ?? 'results'}.csv`, csv)
}