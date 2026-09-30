import { describe, expect, it } from 'vitest'

import {
  buildColorMap,
  buildCoverageProps,
  buildRunTableExecutions,
  resolveActiveRunSummary,
  resolveHistorySourceName,
  resolveTargetCohortName,
  resolveTargetGroup,
} from '@/components/pathway/pathway-workbench-state'

describe('pathway workbench state', () => {
  it('resolves the first target group and its configured cohort name', () => {
    const group = { targetCohortId: 2, totalPathwaysCount: 3, targetCohortCount: 4 }
    expect(resolveTargetGroup({ pathwayGroups: [group] } as never)).toBe(group)
    expect(resolveTargetGroup(null)).toBeNull()
    expect(resolveTargetCohortName({ design: null, targetGroup: group })).toBe('')
    expect(resolveTargetCohortName({ design: { targetCohorts: [{ id: 2, name: 'Target' }] } as never, targetGroup: group })).toBe('Target')
    expect(resolveTargetCohortName({ design: { targetCohorts: [] } as never, targetGroup: group })).toBe('')
    expect(buildCoverageProps(group)).toEqual({ totalPathwaysCount: 3, targetCohortCount: 4 })
    expect(buildCoverageProps(null)).toEqual({ totalPathwaysCount: 0, targetCohortCount: 0 })
  })

  it('builds deterministic colors from result event codes or design cohorts', () => {
    expect(buildColorMap({
      results: { eventCodes: [{ code: 2, isCombo: false }, { code: 1, isCombo: false }, { code: 3, isCombo: true }] } as never,
      design: null,
    })).toEqual(new Map([['1', '#1f77b4'], ['2', '#ff7f0e']]))
    expect(buildColorMap({
      results: null,
      design: { eventCohorts: [{ code: 1 }, { code: null }] } as never,
    })).toEqual(new Map([['2', '#1f77b4'], ['2', '#ff7f0e']]))
  })

  it('builds run rows, overlays a live run, and resolves run metadata', () => {
    expect(buildRunTableExecutions({
      executions: [{ id: 1, sourceKey: 'A', status: 'COMPLETED', startTime: '2026-01-01T00:00:00Z', endTime: 'bad', duration: 12 }],
      liveExecution: { id: 2, sourceKey: 'B', status: 'RUNNING', executionDate: 5 },
    })).toEqual([
      { id: 2, sourceKey: 'B', status: 'RUNNING', startTime: 5 },
      { id: 1, sourceKey: 'A', status: 'COMPLETED', startTime: 1767225600000, endTime: undefined, duration: 12 },
    ])
    expect(buildRunTableExecutions({
      executions: [{ id: 1, sourceKey: 'A', status: 'PENDING' }],
      liveExecution: { id: 2, sourceKey: 'A', status: 'RUNNING', startTime: 9 },
    })[0]).toEqual({ id: 2, sourceKey: 'A', status: 'RUNNING', startTime: 9 })
    expect(buildRunTableExecutions({ executions: [], liveExecution: { id: 3, sourceKey: 'A', status: 'FAILED' } })).toEqual([])
    expect(resolveActiveRunSummary(null)).toBeNull()
    expect(resolveActiveRunSummary(7)).toEqual({ id: 7, sourceKey: '—', age: undefined })
    expect(resolveHistorySourceName({ sourceKey: 'A', sources: [{ sourceKey: 'A', sourceName: 'Alpha' }] })).toBe('Alpha')
    expect(resolveHistorySourceName({ sourceKey: 'missing', sources: [] })).toBe('missing')
  })
})