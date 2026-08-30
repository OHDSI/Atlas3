import type { DistributionStat, LinkedCohort, PrevalenceStat } from '@/models/characterization.types'

export type EmptyVariant = 'no-runs' | 'run-pending' | 'run-failed' | 'results-error' | null

export function resolveCohorts(input: {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
  fallbackCohorts: LinkedCohort[]
}): LinkedCohort[] {
  const map = new Map<number, LinkedCohort>()
  for (const row of input.prevalence) for (const cohort of row.cohorts) if (!map.has(cohort.id)) map.set(cohort.id, cohort)
  for (const row of input.distribution) for (const cohort of row.cohorts) if (!map.has(cohort.id)) map.set(cohort.id, cohort)
  return map.size > 0 ? Array.from(map.values()) : input.fallbackCohorts
}

export function resolveHasStrata(input: { stratasLength: number; stratifiedBy: string | null | undefined }): boolean {
  return input.stratasLength > 0 || (input.stratifiedBy ?? '').trim().length > 0
}

export function resolveAvailableDomains(input: {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
}): string[] {
  const set = new Set<string>()
  for (const row of input.prevalence) if (row.domainId) set.add(row.domainId)
  for (const row of input.distribution) if (row.domainId) set.add(row.domainId)
  return Array.from(set).sort()
}

export function resolveAvailableCohortsForFilter(input: {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
}): LinkedCohort[] {
  const map = new Map<number, LinkedCohort>()
  for (const row of input.prevalence) for (const cohort of row.cohorts) if (!map.has(cohort.id)) map.set(cohort.id, cohort)
  for (const row of input.distribution) for (const cohort of row.cohorts) if (!map.has(cohort.id)) map.set(cohort.id, cohort)
  return Array.from(map.values())
}

export function resolveSelectedExecutionId(runQuery: unknown): number | null {
  if (typeof runQuery === 'string') {
    const parsed = Number(runQuery)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function resolveActiveRunSummary(input: {
  execution: { id: number; sourceKey: string } | null
  resultCount: number
}): { id: number; sourceKey: string; personCount?: number } | null {
  if (!input.execution) return null
  return {
    id: input.execution.id,
    sourceKey: input.execution.sourceKey,
    personCount: input.resultCount || undefined,
  }
}

export function resolveEmptyVariant(input: {
  characterizationId: number | null
  executionCount: number
  selectedExecutionId: number | null
  executionStatus: string | null | undefined
  resultsError?: string | null
}): EmptyVariant {
  if (!input.characterizationId) return null
  if (input.executionCount === 0) return 'no-runs'
  if (input.selectedExecutionId === null) return null
  if (input.executionStatus && input.executionStatus !== 'COMPLETED' && input.executionStatus !== 'FAILED') {
    return 'run-pending'
  }
  if (input.executionStatus === 'FAILED') return 'run-failed'
  // A run can finish and still have its results request fail. Without this the
  // workbench fell through to the result views, which rendered empty off the
  // unpopulated arrays, so a server error reached the user as a blank table
  // and the run itself still looked healthy (#291).
  if (input.executionStatus === 'COMPLETED' && input.resultsError) return 'results-error'
  return null
}

export function resolveHistorySourceName(input: {
  historySourceKey: string | null
  sources: Array<{ sourceKey: string; sourceName?: string | null }>
}): string {
  if (!input.historySourceKey) return ''
  const found = input.sources.find(source => source.sourceKey === input.historySourceKey)
  return found?.sourceName ?? input.historySourceKey
}

export function resolveRunDisabledReason(input: {
  characterizationId: number | null
  isDirty: boolean
  translate: (key: string, fallback: string) => string
}): string {
  if (input.characterizationId == null) {
    return input.translate('characterizations.editor.executions.runDisabledNoId', 'Save the characterization before running.')
  }
  if (input.isDirty) {
    return input.translate('const.disabledReason.dirty', 'Save your changes before running.')
  }
  return ''
}