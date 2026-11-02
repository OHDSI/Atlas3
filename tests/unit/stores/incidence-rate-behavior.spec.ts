import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import type { IncidenceRate } from '@/models/incidence-rate.types'
import { STORAGE_KEY_INCIDENCE_RATE_DRAFT, IR_AUTO_SAVE_INTERVAL_MS } from '@/models/incidence-rate.types'

vi.mock('@/services/incidence-rate.service', () => ({
  getIncidenceRate: vi.fn(),
  saveIncidenceRate: vi.fn(),
  assignIncidenceRateTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignIncidenceRateTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersion: vi.fn(),
}))

vi.mock('@/services/cohort-definition.service', () => ({
  getCohortDefinition: vi.fn(),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ tv: (key: string) => key }),
}))

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { getIncidenceRate, saveIncidenceRate } from '@/services/incidence-rate.service'
import { getIncidenceRateVersion } from '@/services/incidence-rate-versions.service'
import { getCohortDefinition } from '@/services/cohort-definition.service'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

function design(overrides: Partial<IncidenceRate['expression']> = {}, id = 1): IncidenceRate {
  return {
    id,
    name: 'Design',
    expression: {
      ConceptSets: [],
      targetIds: [],
      outcomeIds: [],
      timeAtRisk: {
        start: { DateField: 'StartDate', Offset: 0 },
        end: { DateField: 'EndDate', Offset: 0 },
      },
      strata: [],
      ...overrides,
    },
    tags: [],
  }
}

function cohortResult(name: string) {
  return { success: true, data: { id: 0, name } } as never
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  sessionStorage.clear()
})

describe('incidence-rate store: defaults', () => {
  it('starts editable and with an empty description and concept set list', () => {
    const s = useIncidenceRateStore()
    expect(s.isReadOnly).toBe(false)
    s.createNewIR()
    expect(s.currentIR?.description).toBe('')
    expect(s.currentIR?.expression.ConceptSets).toEqual([])
    expect(s.currentIR?.expression.strata).toEqual([])
  })

  it('gives each new design its own time-at-risk end object', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.expression.timeAtRisk.end.Offset = 999
    s.createNewIR()
    expect(s.currentIR!.expression.timeAtRisk.end.Offset).not.toBe(999)
  })

  it('hasErrors ignores warnings', () => {
    const s = useIncidenceRateStore()
    s.validationErrors = [{ field: 'x', message: 'm', severity: 'warning' }]
    expect(s.hasErrors).toBe(false)
    s.validationErrors = [{ field: 'x', message: 'm', severity: 'error' }]
    expect(s.hasErrors).toBe(true)
  })
})

describe('incidence-rate store: stratify rules', () => {
  function withRules() {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [] } })
    s.addStratifyRule({ name: 'B', expression: { Type: 'ALL', CriteriaList: [] } })
    s.markClean()
    return s
  }

  it('applyStratifyRule is a no-op without a design or for a missing index', () => {
    const empty = useIncidenceRateStore()
    expect(() => empty.applyStratifyRule(0, { name: 'X', expression: { Type: 'ALL', CriteriaList: [] } })).not.toThrow()

    const s = withRules()
    s.applyStratifyRule(5, { name: 'X', expression: { Type: 'ALL', CriteriaList: [] } })
    expect(s.currentIR!.expression.strata.map(r => r.name)).toEqual(['A', 'B'])
    expect(s.isDirty).toBe(false)
  })

  it('moves a rule to index 0', () => {
    const s = withRules()
    s.moveStratifyRule(1, 0)
    expect(s.currentIR!.expression.strata.map(r => r.name)).toEqual(['B', 'A'])
    expect(s.isDirty).toBe(true)
  })

  it.each([
    [-1, 0],
    [0, -1],
    [2, 0],
    [0, 2],
  ])('ignores move from %i to %i', (from, to) => {
    const s = withRules()
    s.moveStratifyRule(from, to)
    expect(s.currentIR!.expression.strata.map(r => r.name)).toEqual(['A', 'B'])
    expect(s.isDirty).toBe(false)
  })
})

describe('incidence-rate store: loading', () => {
  it('loadIR resets generation state and read-only flag', async () => {
    vi.mocked(getIncidenceRate).mockResolvedValue({ success: true, data: design() })
    const s = useIncidenceRateStore()
    s.isReadOnly = true
    s.setExecutionInfo('SRC', { executionInfo: { id: { analysisId: 1, sourceId: 1 }, status: 'COMPLETED' }, summaryList: [] })
    s.setSelectedSource('SRC')
    s.setSelectedTargetOutcome(1, 2)

    expect(await s.loadIR(1)).toBe(true)
    expect(s.isReadOnly).toBe(false)
    expect(s.executionInfoBySourceKey).toEqual({})
    expect(s.selectedSourceKey).toBeNull()
    expect(s.selectedTargetId).toBeNull()
    expect(s.selectedOutcomeId).toBeNull()
  })

  it('resolves names for target and outcome cohorts that are not yet known', async () => {
    vi.mocked(getIncidenceRate).mockResolvedValue({
      success: true,
      data: design({ targetIds: [1, 2], outcomeIds: [3] }),
    })
    vi.mocked(getCohortDefinition).mockImplementation(async (id: number) => cohortResult(`Cohort ${id}`))
    const s = useIncidenceRateStore()
    s.cohortNameById.set(2, 'Known')

    await s.loadIR(1)

    expect(vi.mocked(getCohortDefinition).mock.calls.map(c => c[0]).sort()).toEqual([1, 3])
    expect(s.cohortNameById.get(1)).toBe('Cohort 1')
    expect(s.cohortNameById.get(2)).toBe('Known')
    expect(s.cohortNameById.get(3)).toBe('Cohort 3')
  })

  it('handles designs missing target or outcome id arrays', async () => {
    // Without timeAtRisk the validator skips the id arrays, so only name resolution reads them.
    const data = design({ outcomeIds: [4] })
    delete (data.expression as Partial<IncidenceRate['expression']>).targetIds
    delete (data.expression as Partial<IncidenceRate['expression']>).timeAtRisk
    vi.mocked(getIncidenceRate).mockResolvedValue({ success: true, data })
    vi.mocked(getCohortDefinition).mockResolvedValue(cohortResult('Outcome'))
    const s = useIncidenceRateStore()

    expect(await s.loadIR(1)).toBe(true)
    expect(getCohortDefinition).toHaveBeenCalledWith(4)
    expect(s.cohortNameById.get(4)).toBe('Outcome')

    const noOutcomes = design({ targetIds: [5] })
    delete (noOutcomes.expression as Partial<IncidenceRate['expression']>).outcomeIds
    delete (noOutcomes.expression as Partial<IncidenceRate['expression']>).timeAtRisk
    vi.mocked(getIncidenceRate).mockResolvedValue({ success: true, data: noOutcomes })
    expect(await s.loadIR(1)).toBe(true)
    expect(getCohortDefinition).toHaveBeenCalledWith(5)
  })

  it('does not fetch cohorts when every name is already known', async () => {
    vi.mocked(getIncidenceRate).mockResolvedValue({ success: true, data: design({ targetIds: [1] }) })
    const s = useIncidenceRateStore()
    s.cohortNameById.set(1, 'Known')
    await s.loadIR(1)
    expect(getCohortDefinition).not.toHaveBeenCalled()
  })

  it('skips cohort names from failed or nameless lookups', async () => {
    vi.mocked(getIncidenceRate).mockResolvedValue({
      success: true,
      data: design({ targetIds: [1], outcomeIds: [2] }),
    })
    vi.mocked(getCohortDefinition).mockImplementation(async (id: number) =>
      id === 1 ? ({ success: false, error: new Error('x') } as never) : cohortResult('')
    )
    const s = useIncidenceRateStore()
    await s.loadIR(1)
    expect(s.cohortNameById.has(1)).toBe(false)
    expect(s.cohortNameById.has(2)).toBe(false)
  })

  it('loadVersionPreview leaves the design clean and editable', async () => {
    vi.mocked(getIncidenceRateVersion).mockResolvedValue({
      versionDTO: { assetId: 1, version: 2 } as never,
      entityDTO: design(),
    })
    const s = useIncidenceRateStore()
    s.isDirty = true
    s.isReadOnly = true
    expect(await s.loadVersionPreview(1, 2)).toBe(true)
    expect(s.isDirty).toBe(false)
    expect(s.isReadOnly).toBe(false)
  })

  it('clearPreviewVersion without a saved id clears preview without reloading', async () => {
    const s = useIncidenceRateStore()
    s.currentIR = { ...design(), id: undefined }
    s.previewVersion = { version: 1 } as never
    await s.clearPreviewVersion()
    expect(s.previewVersion).toBeNull()
    expect(getIncidenceRate).not.toHaveBeenCalled()
  })

  it('clearPreviewVersion with no design clears preview', async () => {
    const s = useIncidenceRateStore()
    s.previewVersion = { version: 1 } as never
    await s.clearPreviewVersion()
    expect(s.previewVersion).toBeNull()
  })
})

describe('incidence-rate store: savePreviewAsCurrent', () => {
  it('refuses a preview of an unsaved design', async () => {
    const s = useIncidenceRateStore()
    s.currentIR = { ...design(), id: undefined }
    s.previewVersion = { version: 1 } as never
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(saveIncidenceRate).not.toHaveBeenCalled()
  })

  it('refuses without a design', async () => {
    const s = useIncidenceRateStore()
    s.previewVersion = { version: 1 } as never
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(saveIncidenceRate).not.toHaveBeenCalled()
  })

  it('returns false and keeps the preview when saving throws', async () => {
    vi.mocked(saveIncidenceRate).mockRejectedValue(new Error('network'))
    const s = useIncidenceRateStore()
    s.currentIR = design()
    s.previewVersion = { version: 1 } as never
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(s.previewVersion).not.toBeNull()
  })
})

describe('incidence-rate store: drafts and auto-save', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('restoreFromDraft keeps known cohort names when the draft has none and marks dirty', () => {
    sessionStorage.setItem(STORAGE_KEY_INCIDENCE_RATE_DRAFT, JSON.stringify({ ir: design() }))
    const s = useIncidenceRateStore()
    s.cohortNameById.set(9, 'Kept')
    expect(s.restoreFromDraft()).toBe(true)
    expect(s.cohortNameById.get(9)).toBe('Kept')
    expect(s.isDirty).toBe(true)
  })

  it('stopAutoSave stops a running timer', () => {
    vi.useFakeTimers()
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.markDirty()
    s.startAutoSave()
    s.stopAutoSave()
    vi.advanceTimersByTime(IR_AUTO_SAVE_INTERVAL_MS * 2)
    expect(sessionStorage.getItem(STORAGE_KEY_INCIDENCE_RATE_DRAFT)).toBeNull()
  })
})

describe('incidence-rate store: validateIR', () => {
  function complete() {
    const s = useIncidenceRateStore()
    s.setIR(design({ targetIds: [1], outcomeIds: [2] }))
    return s
  }

  it('flags a whitespace-only name', async () => {
    const s = complete()
    s.currentIR!.name = '   '
    await s.validateIR()
    expect(s.validationErrors).toEqual([
      { field: 'name', message: 'commonErrors.nameRequired', severity: 'error' },
    ])
  })

  it('accepts a complete design', async () => {
    const s = complete()
    await s.validateIR()
    expect(s.validationErrors).toEqual([])
  })

  it('reports an incomplete design when time-at-risk is missing', async () => {
    const s = useIncidenceRateStore()
    const ir = design()
    delete (ir.expression as Partial<IncidenceRate['expression']>).timeAtRisk
    s.setIR(ir)
    await s.validateIR()
    expect(s.validationErrors).toEqual([
      { field: 'expression', message: 'incidenceRate.validation.designIncomplete', severity: 'error' },
    ])
  })

  it('revalidates a design without time-at-risk when its name changes', async () => {
    const s = useIncidenceRateStore()
    const ir = design()
    delete (ir.expression as Partial<IncidenceRate['expression']>).timeAtRisk
    ir.name = ''
    s.setIR(ir)
    await nextTick()
    expect(s.validationErrors.map(e => e.field)).toEqual(['name', 'expression'])
    s.updateMeta({ name: 'Named' })
    await nextTick()
    expect(s.validationErrors.map(e => e.field)).toEqual(['expression'])
  })

  it('reports missing target and outcome cohorts with their messages', async () => {
    const s = useIncidenceRateStore()
    s.setIR(design())
    await s.validateIR()
    expect(s.validationErrors).toEqual([
      { field: 'targetIds', message: 'incidenceRate.validation.targetRequired', severity: 'error' },
      { field: 'outcomeIds', message: 'incidenceRate.validation.outcomeRequired', severity: 'error' },
    ])
  })

  it('rejects equal time-at-risk offsets on the same date field', async () => {
    const s = complete()
    s.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 7 },
      end: { DateField: 'StartDate', Offset: 7 },
    })
    await s.validateIR()
    expect(s.validationErrors).toEqual([
      { field: 'timeAtRisk', message: 'incidenceRate.validation.timeAtRiskOrder', severity: 'error' },
    ])
  })

  it('accepts a later end offset on the same date field', async () => {
    const s = complete()
    s.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 0 },
      end: { DateField: 'StartDate', Offset: 1 },
    })
    await s.validateIR()
    expect(s.validationErrors).toEqual([])
  })

  it('rejects a study window whose start equals its end', async () => {
    const s = complete()
    s.setStudyWindow({ startDate: '2020-01-01', endDate: '2020-01-01' })
    await s.validateIR()
    expect(s.validationErrors).toEqual([
      { field: 'studyWindow', message: 'incidenceRate.validation.studyWindowOrder', severity: 'error' },
    ])
  })

  it.each([
    [{ startDate: '2020-01-01', endDate: '2020-12-31' }],
    [{ startDate: '2020-01-01', endDate: '' }],
    [{ startDate: '', endDate: '2020-01-01' }],
  ])('accepts study window %o', async window => {
    const s = complete()
    s.setStudyWindow(window)
    await s.validateIR()
    expect(s.validationErrors).toEqual([])
  })
})

describe('incidence-rate store: tags without a design', () => {
  it('addTag, removeTag and syncTags return false when no design is loaded', async () => {
    const s = useIncidenceRateStore()
    await expect(s.addTag({ id: 1, name: 't' } as never)).resolves.toBe(false)
    await expect(s.removeTag(1)).resolves.toBe(false)
    await expect(s.syncTags([])).resolves.toBe(false)
  })

  it('syncTags returns false for an unsaved design', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    await expect(s.syncTags([])).resolves.toBe(false)
  })
})

describe('incidence-rate store: canSave and canGenerate edge cases', () => {
  it('canSave is false for a whitespace-only name', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: '   ' })
    expect(s.canSave).toBe(false)
  })

  it('canSave is false when dirty without a design or without a name', () => {
    const s = useIncidenceRateStore()
    s.markDirty()
    expect(s.canSave).toBe(false)
    s.currentIR = { ...design(), name: undefined as unknown as string }
    s.markDirty()
    expect(s.canSave).toBe(false)
  })

  it('canGenerate is false without a design', () => {
    const s = useIncidenceRateStore()
    expect(s.canGenerate).toBe(false)
  })
})

describe('incidence-rate store: executions start times', () => {
  it('parses string start times, treats empty or missing ones as null, and sorts nulls last', () => {
    const s = useIncidenceRateStore()
    s.setExecutionInfo('ISO', {
      executionInfo: { id: { analysisId: 1, sourceId: 1 }, status: 'COMPLETED', startTime: '2020-01-01T00:00:00Z' },
      summaryList: [],
    } as never)
    s.setExecutionInfo('EMPTY', {
      executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'PENDING', startTime: '' },
      summaryList: [],
    } as never)
    s.setExecutionInfo('NUM', {
      executionInfo: { id: { analysisId: 1, sourceId: 3 }, status: 'STARTED', startTime: 1000 },
      summaryList: [],
    })
    expect(s.executions.map(e => [e.sourceKey, e.startTime])).toEqual([
      ['ISO', Date.UTC(2020, 0, 1)],
      ['NUM', 1000],
      ['EMPTY', null],
    ])
  })

  it('sorts a null start time after a dated one regardless of insertion order', () => {
    const s = useIncidenceRateStore()
    s.setExecutionInfo('NONE', {
      executionInfo: { id: { analysisId: 1, sourceId: 1 }, status: 'PENDING' },
      summaryList: [],
    })
    s.setExecutionInfo('A', {
      executionInfo: { id: { analysisId: 1, sourceId: 2 }, status: 'COMPLETED', startTime: 500 },
      summaryList: [],
    })
    s.setExecutionInfo('B', {
      executionInfo: { id: { analysisId: 1, sourceId: 3 }, status: 'COMPLETED', startTime: 900 },
      summaryList: [],
    })
    expect(s.executions.map(e => e.sourceKey)).toEqual(['B', 'A', 'NONE'])
  })
})

describe('incidence-rate store: applyProposal', () => {
  function fresh() {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'Original', description: 'Original description' })
    s.markClean()
    return s
  }

  it('returns false and changes nothing for an empty payload', () => {
    const s = fresh()
    const before = JSON.parse(JSON.stringify(s.currentIR))
    expect(s.applyProposal({})).toBe(false)
    expect(s.isDirty).toBe(false)
    expect(JSON.parse(JSON.stringify(s.currentIR))).toEqual(before)
  })

  it('ignores a blank name', () => {
    const s = fresh()
    expect(s.applyProposal({ name: '   ' })).toBe(false)
    expect(s.currentIR!.name).toBe('Original')
  })

  it('applies an empty description', () => {
    const s = fresh()
    expect(s.applyProposal({ description: '' })).toBe(true)
    expect(s.currentIR!.description).toBe('')
    expect(s.currentIR!.name).toBe('Original')
  })

  it('ignores a non-string description', () => {
    const s = fresh()
    expect(s.applyProposal({ description: 5 as unknown as string })).toBe(false)
    expect(s.currentIR!.description).toBe('Original description')
  })

  it.each([
    ['targetIds', { targetIds: [1] }],
    ['outcomeIds', { outcomeIds: [2] }],
    ['targetIdsToAdd', { targetIdsToAdd: [{ id: 3 }] }],
    ['outcomeIdsToAdd', { outcomeIdsToAdd: [{ id: 4 }] }],
    ['timeAtRisk', { timeAtRisk: { end: { DateField: 'EndDate' as const, Offset: 1 } } }],
    ['studyWindow', { studyWindow: { startDate: '2020-01-01', endDate: '2020-02-01' } }],
  ])('reports %s alone as applied', (_label, payload) => {
    const s = fresh()
    expect(s.applyProposal(payload)).toBe(true)
    expect(s.isDirty).toBe(true)
  })

  it('reports empty cohort additions as not applied', () => {
    const s = fresh()
    expect(s.applyProposal({ targetIdsToAdd: [], outcomeIdsToAdd: [] })).toBe(false)
    expect(s.isDirty).toBe(false)
  })

  it('prefers replacing ids over adding them when both are given', () => {
    const s = fresh()
    s.addTargetCohortId(9)
    s.addOutcomeCohortId(8)
    s.applyProposal({
      targetIds: [1],
      targetIdsToAdd: [{ id: 2 }],
      outcomeIds: [3],
      outcomeIdsToAdd: [{ id: 4 }],
    })
    expect(s.currentIR!.expression.targetIds).toEqual([1])
    expect(s.currentIR!.expression.outcomeIds).toEqual([3])
  })
})
