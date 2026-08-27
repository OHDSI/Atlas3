import type { PathwayExecution } from '@/models/pathway.types'
import type { RunTableExecution } from '@/components/generation/DataSourceRunTable.vue'
import type { PathwayDesign, PathwayResults } from '@/models/pathway-results.types'

const PALETTE_20 = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
  '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
  '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5',
]

export function resolveTargetGroup(results: PathwayResults | null | undefined) {
  return results?.pathwayGroups[0] ?? null
}

export function resolveTargetCohortName(input: {
  design: PathwayDesign | null | undefined
  targetGroup: { targetCohortId: number } | null
}): string {
  if (!input.design || !input.targetGroup) return ''
  return input.design.targetCohorts.find(c => c.id === input.targetGroup.targetCohortId)?.name ?? ''
}

export function buildColorMap(input: {
  results: PathwayResults | null | undefined
  design: PathwayDesign | null | undefined
}): Map<string, string> {
  const map = new Map<string, string>()
  const singleCodes = (input.results?.eventCodes ?? [])
    .filter(ec => !ec.isCombo)
    .sort((a, b) => a.code - b.code)
  if (singleCodes.length > 0) {
    singleCodes.forEach((ec, i) => {
      map.set(String(ec.code), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  } else if (input.design) {
    input.design.eventCohorts.forEach((cohort, i) => {
      const bit = cohort.code != null ? (1 << cohort.code) : (1 << i)
      map.set(String(bit), PALETTE_20[i % PALETTE_20.length] ?? '#cccccc')
    })
  }
  return map
}

export function resolveActiveRunSummary(selectedExecutionId: number | null | undefined) {
  if (!selectedExecutionId) return null
  return { id: selectedExecutionId, sourceKey: '—', age: undefined }
}

export function buildCoverageProps(targetGroup: { totalPathwaysCount: number; targetCohortCount: number } | null) {
  return {
    totalPathwaysCount: targetGroup?.totalPathwaysCount ?? 0,
    targetCohortCount: targetGroup?.targetCohortCount ?? 0,
  }
}

function toMs(v: string | number | undefined): number | undefined {
  if (v === undefined) return undefined
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
