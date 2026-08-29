import { arrayToCsv, downloadCsv } from '@/utils/csv'
import type { GenerationStatus } from '@/models/characterization.types'
import type { RunTableExecution, RunTableSource } from '@/components/generation/DataSourceRunTable.vue'
import type { IncidenceRateExecutionSummary } from '@/stores/incidence-rate'

function toMs(value: string | number | null | undefined): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? undefined : parsed
}

export function resolveSelectedExecutionId(runQuery: unknown): number | null {
  if (typeof runQuery === 'string') {
    const parsed = Number(runQuery)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function resolveRunTableSources(input: Array<{ sourceId: number; sourceKey: string; sourceName: string }>): RunTableSource[] {
  return input.map(source => ({ sourceId: source.sourceId, sourceKey: source.sourceKey, sourceName: source.sourceName }))
}

export function mapStatus(raw: string): GenerationStatus {
  return raw === 'COMPLETE' ? 'COMPLETED' : (raw as GenerationStatus)
}

export function buildRunTableExecutions(input: Array<{
  id: number
  sourceKey: string
  status: string
  startTime?: string | number | null
  endTime?: string | number | null
  duration?: number | null
}>): RunTableExecution[] {
  return input.map(execution => ({
    id: execution.id,
    sourceKey: execution.sourceKey,
    status: mapStatus(execution.status),
    startTime: toMs(execution.startTime),
    endTime: toMs(execution.endTime),
    duration: execution.duration ?? undefined,
  }))
}

export function resolveRunDisabledReason(input: {
  isPreviewMode: boolean
  isDirty: boolean
  hasErrors: boolean
  translate: (key: string, fallback: string) => string
}): string {
  if (input.isPreviewMode) return input.translate('common.previewMode', 'Preview mode')
  if (input.isDirty) return input.translate('components.generation.unsavedChanges', 'Save changes before running')
  if (input.hasErrors) return input.translate('components.generation.fixErrors', 'Resolve validation errors before running')
  return ''
}

export function resolveHistorySourceName(input: {
  historySourceKey: string | null
  sources: Array<{ sourceKey: string; sourceName: string }>
}): string {
  if (!input.historySourceKey) return ''
  return input.sources.find(source => source.sourceKey === input.historySourceKey)?.sourceName ?? input.historySourceKey
}

export function resolveActiveRun(input: {
  selectedExecutionId: number | null
  executionById: (id: number) => IncidenceRateExecutionSummary | null
}): IncidenceRateExecutionSummary | null {
  return input.selectedExecutionId === null ? null : input.executionById(input.selectedExecutionId)
}

export function resolveEmptyVariant(input: {
  currentIRId: number | null | undefined
  selectedExecutionId: number | null
  activeRun: IncidenceRateExecutionSummary | null
  selectedTargetId: number | null
  selectedOutcomeId: number | null
  terminalStatuses: Set<string>
}): 'run-pending' | 'run-failed' | 'select-to' | null {
  if (!input.currentIRId) return null
  if (input.selectedExecutionId === null) return null
  if (input.activeRun && !input.terminalStatuses.has(input.activeRun.status)) return 'run-pending'
  if (input.activeRun?.status === 'FAILED') return 'run-failed'
  if (!input.selectedTargetId || !input.selectedOutcomeId) return 'select-to'
  return null
}

export function buildCsvExport(input: {
  selectedExecutionId: number | null
  report: {
    summary: { totalPersons: number; cases: number; timeAtRisk: number }
    stratifyStats: Array<{ name: string; totalPersons: number; cases: number; timeAtRisk: number }>
  } | null
}): void {
  if (!input.report) return
  type CsvRow = { name: string; totalPersons: number; cases: number; timeAtRisk: number }
  const rows: CsvRow[] = [
    {
      name: 'Summary',
      totalPersons: input.report.summary.totalPersons,
      cases: input.report.summary.cases,
      timeAtRisk: input.report.summary.timeAtRisk,
    },
    ...input.report.stratifyStats.map(stratum => ({
      name: stratum.name,
      totalPersons: stratum.totalPersons,
      cases: stratum.cases,
      timeAtRisk: stratum.timeAtRisk,
    })),
  ]
  const headers: { key: keyof CsvRow; label: string }[] = [
    { key: 'name', label: 'Stratum' },
    { key: 'totalPersons', label: 'Persons' },
    { key: 'cases', label: 'Cases' },
    { key: 'timeAtRisk', label: 'TAR (days)' },
  ]
  downloadCsv(`incidence-rate-${input.selectedExecutionId ?? 'results'}.csv`, arrayToCsv(rows, headers))
}