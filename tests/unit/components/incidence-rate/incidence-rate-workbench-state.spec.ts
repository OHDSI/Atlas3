import { describe, expect, it, vi } from 'vitest'

vi.mock('@/utils/csv', () => ({ arrayToCsv: vi.fn(), downloadCsv: vi.fn() }))

import {
  buildCsvExport,
  buildRunTableExecutions,
  mapStatus,
  resolveActiveRun,
  resolveEmptyVariant,
  resolveHistorySourceName,
  resolveRunDisabledReason,
  resolveRunTableSources,
  resolveSelectedExecutionId,
} from '@/components/incidence-rate/incidence-rate-workbench-state'
import { arrayToCsv, downloadCsv } from '@/utils/csv'

describe('incidence-rate workbench state', () => {
  it('normalizes query, source, status, and execution table values', () => {
    expect(resolveSelectedExecutionId('7')).toBe(7)
    expect(resolveSelectedExecutionId('not-a-number')).toBeNull()
    expect(resolveSelectedExecutionId(7)).toBeNull()
    expect(resolveRunTableSources([{ sourceId: 1, sourceKey: 'A', sourceName: 'Alpha' }])).toEqual([{ sourceId: 1, sourceKey: 'A', sourceName: 'Alpha' }])
    expect(mapStatus('COMPLETE')).toBe('COMPLETED')
    expect(mapStatus('FAILED')).toBe('FAILED')
    expect(buildRunTableExecutions([{ id: 1, sourceKey: 'A', status: 'COMPLETE', startTime: 'bad', endTime: 3, duration: null }])).toEqual([
      { id: 1, sourceKey: 'A', status: 'COMPLETED', startTime: undefined, endTime: 3, duration: undefined },
    ])
  })

  it('resolves run restrictions, history, active runs, and empty states', () => {
    const translate = (_key: string, fallback: string) => fallback
    expect(resolveRunDisabledReason({ isPreviewMode: true, isDirty: true, hasErrors: true, translate })).toBe('Preview mode')
    expect(resolveRunDisabledReason({ isPreviewMode: false, isDirty: true, hasErrors: true, translate })).toBe('Save changes before running')
    expect(resolveRunDisabledReason({ isPreviewMode: false, isDirty: false, hasErrors: true, translate })).toBe('Resolve validation errors before running')
    expect(resolveRunDisabledReason({ isPreviewMode: false, isDirty: false, hasErrors: false, translate })).toBe('')
    expect(resolveHistorySourceName({ historySourceKey: null, sources: [] })).toBe('')
    expect(resolveHistorySourceName({ historySourceKey: 'A', sources: [{ sourceKey: 'A', sourceName: 'Alpha' }] })).toBe('Alpha')
    expect(resolveHistorySourceName({ historySourceKey: 'missing', sources: [] })).toBe('missing')
    expect(resolveActiveRun({ selectedExecutionId: null, executionById: vi.fn() })).toBeNull()
    expect(resolveActiveRun({ selectedExecutionId: 2, executionById: id => ({ id, sourceKey: 'A', sourceId: 1, status: 'RUNNING', startTime: null, duration: null, message: null }) })).toMatchObject({ id: 2 })
    const base = { currentIRId: 1, selectedExecutionId: 2, selectedTargetId: 1, selectedOutcomeId: 2, terminalStatuses: new Set(['COMPLETED', 'FAILED']) }
    expect(resolveEmptyVariant({ ...base, activeRun: { status: 'RUNNING' } as never })).toBe('run-pending')
    expect(resolveEmptyVariant({ ...base, activeRun: { status: 'FAILED' } as never })).toBe('run-failed')
    expect(resolveEmptyVariant({ ...base, activeRun: null, selectedTargetId: null })).toBe('select-to')
    expect(resolveEmptyVariant({ ...base, activeRun: null })).toBeNull()
    expect(resolveEmptyVariant({ ...base, currentIRId: null, activeRun: null })).toBeNull()
    expect(resolveEmptyVariant({ ...base, selectedExecutionId: null, activeRun: null })).toBeNull()
  })

  it('exports summary and stratified report rows when a report exists', () => {
    buildCsvExport({ selectedExecutionId: null, report: null })
    expect(downloadCsv).not.toHaveBeenCalled()
    buildCsvExport({
      selectedExecutionId: 8,
      report: { summary: { totalPersons: 10, cases: 2, timeAtRisk: 30 }, stratifyStats: [{ name: 'Female', totalPersons: 6, cases: 1, timeAtRisk: 20 }] },
    })
    expect(arrayToCsv).toHaveBeenCalledWith([
      { name: 'Summary', totalPersons: 10, cases: 2, timeAtRisk: 30 },
      { name: 'Female', totalPersons: 6, cases: 1, timeAtRisk: 20 },
    ], expect.any(Array))
    expect(downloadCsv).toHaveBeenCalledWith('incidence-rate-8.csv', undefined)
  })
})