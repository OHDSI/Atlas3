import type { Pathway, PathwayExecution, PathwayGroup, PathwayResults } from '@/models/pathway.types'
import type { RunTableExecution } from '@/components/generation/DataSourceRunTable.vue'

const PALETTE_20 = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
]

export function resolveTargetGroup(results: PathwayResults | null | undefined): PathwayResults['pathwayGroups'][number] | null {
  return results?.pathwayGroups[0] ?? null
}

export function resolveTargetCohortName(input: {
  design: Pathway | null | undefined
  targetGroup: { targetCohortId: number } | null
}): string {
  const targetGroup = input.targetGroup
  if (!input.design || !targetGroup) return ''
  return input.design.targetCohorts.find(cohort => cohort.id === targetGroup.targetCohortId)?.name ?? ''
}

export function resolveCohortName(design: Pathway | null | undefined, cohortId: number): string {
  return design?.targetCohorts.find(cohort => cohort.id === cohortId)?.name ?? `#${cohortId}`
}

export interface PathwayCohortResultRow {
  targetCohortId: number
  cohortName: string
  group?: PathwayGroup
}

export function buildCohortResultRows(
  design: Pathway | null | undefined,
  results: PathwayResults | null | undefined
): PathwayCohortResultRow[] {
  const groups = results?.pathwayGroups ?? []
  const resultRows = design?.targetCohorts.map(cohort => ({
    targetCohortId: cohort.id,
    cohortName: cohort.name,
    group: groups.find(group => group.targetCohortId === cohort.id),
  })) ?? []
  const configuredIds = new Set(resultRows.map(row => row.targetCohortId))

  return [
    ...resultRows,
    ...groups
      .filter(group => !configuredIds.has(group.targetCohortId))
      .map(group => ({
        targetCohortId: group.targetCohortId,
        cohortName: resolveCohortName(design, group.targetCohortId),
        group,
      })),
  ]
}

export function buildColorMap(input: {
  results: PathwayResults | null | undefined
  design: Pathway | null | undefined
}): Map<string, string> {
  const map = new Map<string, string>()
  const singleCodes = (input.results?.eventCodes ?? [])
    .filter(eventCode => !eventCode.isCombo)
    .sort((a, b) => a.code - b.code)
  if (singleCodes.length > 0) {
    singleCodes.forEach((eventCode, index) => {
      map.set(String(eventCode.code), PALETTE_20[index % PALETTE_20.length] ?? '#cccccc')
    })
  } else if (input.design) {
    input.design.eventCohorts.forEach((cohort, index) => {
      const bit = cohort.code != null ? (1 << cohort.code) : (1 << index)
      map.set(String(bit), PALETTE_20[index % PALETTE_20.length] ?? '#cccccc')
    })
  }
  return map
}

export function resolveActiveRunSummary(selectedExecutionId: number | null | undefined): { id: number; sourceKey: string; age?: string } | null {
  if (!selectedExecutionId) return null
  return { id: selectedExecutionId, sourceKey: '—', age: undefined }
}

export function buildCoverageProps(targetGroup: { totalPathwaysCount: number; targetCohortCount: number } | null) {
  return {
    totalPathwaysCount: targetGroup?.totalPathwaysCount ?? 0,
    targetCohortCount: targetGroup?.targetCohortCount ?? 0,
  }
}

function toMs(v: string | number | null | undefined): number | undefined {
  if (v == null) return undefined
  if (typeof v === 'number') return v
  const parsed = Date.parse(v)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function buildRunTableExecutions(input: {
  executions: PathwayExecution[]
  liveExecution: PathwayExecution | null | undefined
}): RunTableExecution[] {
  const rows: RunTableExecution[] = input.executions.map(e => {
    const start = toMs(e.startTime) ?? toMs(e.executionDate)
    const end = toMs(e.endTime)
    return {
      id: e.id,
      sourceKey: e.sourceKey,
      status: e.status,
      startTime: start,
      endTime: end,
      duration: e.duration,
    }
  })

  const live = input.liveExecution
  if (live && !['COMPLETED', 'FAILED', 'CANCELED'].includes(live.status)) {
    const idx = rows.findIndex(r => r.sourceKey === live.sourceKey)
    const liveRow: RunTableExecution = {
      id: live.id,
      sourceKey: live.sourceKey,
      status: live.status,
      startTime: toMs(live.startTime) ?? toMs(live.executionDate),
    }
    if (idx >= 0) rows[idx] = liveRow
    else rows.unshift(liveRow)
  }

  return rows
}

export function resolveHistorySourceName(input: {
  sourceKey: string
  sources: Array<{ sourceKey: string; sourceName: string }>
}): string {
  const match = input.sources.find(s => s.sourceKey === input.sourceKey)
  return match?.sourceName ?? input.sourceKey
}
