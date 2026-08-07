import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi', () => ({
  getIncidenceRate: vi.fn(),
  assignIncidenceRateTag: vi.fn().mockResolvedValue(true),
  unassignIncidenceRateTag: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

let webapi: typeof import('@/services/webapi')
let versions: typeof import('@/services/incidence-rate-versions.service')
let useIncidenceRateStore: typeof import('@/stores/incidence-rate').useIncidenceRateStore
let IR_AUTO_SAVE_INTERVAL_MS: typeof import('@/models/incidence-rate.types').IR_AUTO_SAVE_INTERVAL_MS

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  versions = await import('@/services/incidence-rate-versions.service')
  ;({ useIncidenceRateStore } = await import('@/stores/incidence-rate'))
  ;({ IR_AUTO_SAVE_INTERVAL_MS } = await import('@/models/incidence-rate.types'))
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('incidence-rate store', () => {
  it('createNewIR sets defaults', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    expect(s.currentIR?.expression.timeAtRisk.start.DateField).toBe('StartDate')
    expect(s.currentIR?.expression.targetIds).toEqual([])
    expect(s.isDirty).toBe(false)
  })

  it('addTargetCohortId / removeTargetCohortId / dedupes', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addTargetCohortId(1, 'A')
    s.addTargetCohortId(1, 'A') // dedupe
    s.addTargetCohortId(2, 'B')
    expect(s.currentIR!.expression.targetIds).toEqual([1, 2])
    expect(s.isDirty).toBe(true)
    s.removeTargetCohortId(1)
    expect(s.currentIR!.expression.targetIds).toEqual([2])
  })

  it('addOutcomeCohortId mirrors target', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addOutcomeCohortId(5, 'O')
    expect(s.currentIR!.expression.outcomeIds).toEqual([5])
    expect(s.cohortNameById.get(5)).toBe('O')
  })

  it('updateTimeAtRisk merges', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateTimeAtRisk({ end: { DateField: 'EndDate', Offset: 365 } })
    expect(s.currentIR!.expression.timeAtRisk.end.Offset).toBe(365)
  })

  it('setStudyWindow / clearStudyWindow', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.setStudyWindow({ startDate: '2020-01-01', endDate: '2020-12-31' })
    expect(s.currentIR!.expression.studyWindow?.startDate).toBe('2020-01-01')
    s.clearStudyWindow()
    expect(s.currentIR!.expression.studyWindow).toBeUndefined()
  })

  it('addStratifyRule / updateStratifyRule / removeStratifyRule / move', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [] } })
    s.addStratifyRule({ name: 'B', expression: { Type: 'ALL', CriteriaList: [] } })
    expect(s.currentIR!.expression.strata.map(r => r.name)).toEqual(['A', 'B'])
    s.updateStratifyRule(0, { name: 'A2' })
    expect(s.currentIR!.expression.strata[0].name).toBe('A2')
    s.moveStratifyRule(0, 1)
    expect(s.currentIR!.expression.strata.map(r => r.name)).toEqual(['B', 'A2'])
    s.removeStratifyRule(1)
    expect(s.currentIR!.expression.strata).toHaveLength(1)
  })

  it('validateIR errors when name empty / no targets / no outcomes / TAR conflict', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    await s.validateIR()
    const fields = s.validationErrors.map(e => e.field)
    expect(fields).toContain('name')
    expect(fields).toContain('targetIds')
    expect(fields).toContain('outcomeIds')

    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    s.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 5 },
      end: { DateField: 'StartDate', Offset: 0 },
    })
    await s.validateIR()
    expect(s.validationErrors.some(e => e.field === 'timeAtRisk')).toBe(true)
  })

  it('saveToDraft / restoreFromDraft / clearDraft round-trip', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'Draft test' })
    s.saveToDraft()
    s.currentIR = null
    expect(s.restoreFromDraft()).toBe(true)
    expect(s.currentIR!.name).toBe('Draft test')
    s.clearDraft()
    s.currentIR = null
    expect(s.restoreFromDraft()).toBe(false)
  })

  it('loadIR delegates to webapi.getIncidenceRate', async () => {
    vi.mocked(webapi.getIncidenceRate).mockResolvedValueOnce({
      success: true,
      data: {
        id: 1, name: 'X',
        expression: {
          ConceptSets: [], targetIds: [], outcomeIds: [],
          timeAtRisk: { start: { DateField: 'StartDate', Offset: 0 }, end: { DateField: 'EndDate', Offset: 0 } },
          strata: [],
        },
        tags: [],
      } as never,
    })
    const s = useIncidenceRateStore()
    const ok = await s.loadIR(1)
    expect(ok).toBe(true)
    expect(s.currentIR?.name).toBe('X')
  })

  it('loadVersionPreview sets previewVersion', async () => {
    vi.mocked(versions.getIncidenceRateVersion).mockResolvedValueOnce({
      versionDTO: { assetId: 1, version: 2 } as never,
      entityDTO: {
        id: 1, name: 'V',
        expression: {
          ConceptSets: [], targetIds: [], outcomeIds: [],
          timeAtRisk: { start: { DateField: 'StartDate', Offset: 0 }, end: { DateField: 'EndDate', Offset: 0 } },
          strata: [],
        },
        tags: [],
      } as never,
    })
    const s = useIncidenceRateStore()
    await s.loadVersionPreview(1, 2)
    expect(s.isPreviewMode).toBe(true)
    expect(s.currentIR?.name).toBe('V')
    s.clearPreviewVersion()
    expect(s.isPreviewMode).toBe(false)
  })

  it('addTag does not mark dirty (metadata only)', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    expect(s.isDirty).toBe(false)
    await s.addTag({ id: 1, name: 'covid' } as never)
    expect(s.currentIR!.tags.map(t => t.name)).toEqual(['covid'])
    expect(s.isDirty).toBe(false)
  })
})

describe('incidence-rate store — extended mutators', () => {
  it('mutators no-op when currentIR is null', () => {
    const s = useIncidenceRateStore()
    expect(s.currentIR).toBeNull()
    s.updateExpression({ targetIds: [9] })
    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.removeTargetCohortId(1)
    s.addOutcomeCohortId(2, 'B')
    s.removeOutcomeCohortId(2)
    s.updateTimeAtRisk({ start: { DateField: 'StartDate', Offset: 0 } })
    s.setStudyWindow({ startDate: '2020-01-01', endDate: '2020-12-31' })
    s.clearStudyWindow()
    s.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [] } } as never)
    s.updateStratifyRule(0, { name: 'A2' })
    s.removeStratifyRule(0)
    s.moveStratifyRule(0, 1)
    expect(s.currentIR).toBeNull()
    expect(s.isDirty).toBe(false)
  })

  it('updateExpression merges into expression', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateExpression({ ConceptSets: [{ id: 1, name: 'CS', expression: { items: [] } } as never] })
    expect(s.currentIR!.expression.ConceptSets).toHaveLength(1)
    expect(s.isDirty).toBe(true)
  })

  it('removeOutcomeCohortId removes id', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addOutcomeCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    s.removeOutcomeCohortId(1)
    expect(s.currentIR!.expression.outcomeIds).toEqual([2])
  })

  it('addOutcomeCohortId dedupes', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addOutcomeCohortId(1, 'A')
    s.addOutcomeCohortId(1, 'A again')
    expect(s.currentIR!.expression.outcomeIds).toEqual([1])
  })

  it('addTargetCohortId without name does not write to cohortNameById', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addTargetCohortId(7)
    expect(s.cohortNameById.has(7)).toBe(false)
  })

  it('addOutcomeCohortId without name does not write to cohortNameById', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addOutcomeCohortId(7)
    expect(s.cohortNameById.has(7)).toBe(false)
  })

  it('moveStratifyRule clamps invalid indices', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [] } } as never)
    s.markClean()
    s.moveStratifyRule(-1, 0)
    s.moveStratifyRule(0, 99)
    s.moveStratifyRule(99, 0)
    expect(s.currentIR!.expression.strata).toHaveLength(1)
    expect(s.isDirty).toBe(false)
  })

  it('updateStratifyRule no-ops when index out of range', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addStratifyRule({ name: 'A', expression: { Type: 'ALL', CriteriaList: [] } } as never)
    s.markClean()
    s.updateStratifyRule(99, { name: 'X' })
    expect(s.isDirty).toBe(false)
    expect(s.currentIR!.expression.strata[0].name).toBe('A')
  })

  it('markClean / markDirty flip the flag', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.markDirty()
    expect(s.isDirty).toBe(true)
    s.markClean()
    expect(s.isDirty).toBe(false)
  })

  it('setIR replaces currentIR and clears dirty', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.markDirty()
    const ir = {
      id: 5, name: 'preset',
      expression: {
        ConceptSets: [], targetIds: [1], outcomeIds: [2],
        timeAtRisk: { start: { DateField: 'StartDate', Offset: 0 }, end: { DateField: 'EndDate', Offset: 0 } },
        strata: [],
      },
      tags: [],
    }
    s.setIR(ir as never)
    expect(s.currentIR?.id).toBe(5)
    expect(s.isDirty).toBe(false)
    expect(s.validationErrors).toEqual([])
  })
})

describe('incidence-rate store — load/preview lifecycle', () => {
  it('loadIR returns false on error result', async () => {
    vi.mocked(webapi.getIncidenceRate).mockResolvedValueOnce({
      success: false,
      error: 'boom',
    } as never)
    const s = useIncidenceRateStore()
    const ok = await s.loadIR(1)
    expect(ok).toBe(false)
    expect(s.currentIR).toBeNull()
  })

  it('loadVersionPreview returns false on exception', async () => {
    vi.mocked(versions.getIncidenceRateVersion).mockRejectedValueOnce(new Error('crash'))
    const s = useIncidenceRateStore()
    const ok = await s.loadVersionPreview(1, 1)
    expect(ok).toBe(false)
  })
})

describe('incidence-rate store — draft error paths', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('saveToDraft no-ops when no current IR', () => {
    const s = useIncidenceRateStore()
    s.saveToDraft()
    expect(s.lastAutoSave).toBeNull()
    expect(sessionStorage.getItem('atlas3_incidence_rate_draft')).toBeNull()
  })

  it('saveToDraft swallows storage errors', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function () {
      throw new Error('quota')
    }
    try {
      expect(() => s.saveToDraft()).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })

  it('restoreFromDraft returns false when no draft', () => {
    const s = useIncidenceRateStore()
    expect(s.restoreFromDraft()).toBe(false)
  })

  it('restoreFromDraft returns false on parse error', () => {
    sessionStorage.setItem('atlas3_incidence_rate_draft', 'not json')
    const s = useIncidenceRateStore()
    expect(s.restoreFromDraft()).toBe(false)
  })

  it('clearDraft swallows storage errors', () => {
    const original = Storage.prototype.removeItem
    Storage.prototype.removeItem = function () {
      throw new Error('boom')
    }
    try {
      const s = useIncidenceRateStore()
      expect(() => s.clearDraft()).not.toThrow()
    } finally {
      Storage.prototype.removeItem = original
    }
  })

  it('saveToDraft persists cohort name map and restoreFromDraft restores it', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.addTargetCohortId(1, 'TargetA')
    s.addOutcomeCohortId(2, 'OutcomeB')
    s.saveToDraft()

    s.currentIR = null
    s.cohortNameById = new Map()
    expect(s.restoreFromDraft()).toBe(true)
    expect(s.cohortNameById.get(1)).toBe('TargetA')
    expect(s.cohortNameById.get(2)).toBe('OutcomeB')
  })
})

describe('incidence-rate store — auto-save timer', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('startAutoSave persists on dirty after interval', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'Auto' })
    s.startAutoSave()

    vi.advanceTimersByTime(IR_AUTO_SAVE_INTERVAL_MS + 10)

    expect(sessionStorage.getItem('atlas3_incidence_rate_draft')).not.toBeNull()
    s.stopAutoSave()
  })

  it('startAutoSave does not persist when not dirty', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.markClean()
    s.startAutoSave()

    vi.advanceTimersByTime(IR_AUTO_SAVE_INTERVAL_MS + 10)

    expect(sessionStorage.getItem('atlas3_incidence_rate_draft')).toBeNull()
    s.stopAutoSave()
  })

  it('stopAutoSave is idempotent', () => {
    const s = useIncidenceRateStore()
    expect(() => {
      s.stopAutoSave()
      s.stopAutoSave()
    }).not.toThrow()
  })

  it('startAutoSave cancels prior timer', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'A' })
    s.startAutoSave()
    s.startAutoSave() // stop+restart, no double-fire
    vi.advanceTimersByTime(IR_AUTO_SAVE_INTERVAL_MS + 10)
    s.stopAutoSave()
  })
})

describe('incidence-rate store — validation studyWindow + edge cases', () => {
  it('validateIR errors on inverted study window', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    s.setStudyWindow({ startDate: '2021-01-01', endDate: '2020-01-01' })
    await s.validateIR()
    expect(s.validationErrors.some(e => e.field === 'studyWindow')).toBe(true)
  })

  it('validateIR with no current IR clears errors', async () => {
    const s = useIncidenceRateStore()
    s.validationErrors = [
      { field: 'name', message: 'old', severity: 'error' },
    ]
    await s.validateIR()
    expect(s.validationErrors).toEqual([])
  })

  it('validateIR allows different DateFields without TAR error', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'OK' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    s.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 100 },
      end: { DateField: 'EndDate', Offset: 0 },
    })
    await s.validateIR()
    expect(s.validationErrors.some(e => e.field === 'timeAtRisk')).toBe(false)
  })
})

describe('incidence-rate store — tags', () => {
  beforeEach(() => {
    vi.mocked(webapi.assignIncidenceRateTag).mockResolvedValue(true)
    vi.mocked(webapi.unassignIncidenceRateTag).mockResolvedValue(true)
  })

  it('addTag returns false without id', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(false)
  })

  it('addTag does not double add', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    s.currentIR!.tags = [{ id: 1, name: 'covid' } as never]
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(true)
    expect(s.currentIR?.tags).toHaveLength(1)
  })

  it('addTag returns false on API failure', async () => {
    vi.mocked(webapi.assignIncidenceRateTag).mockResolvedValueOnce(false)
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(false)
    expect(s.currentIR?.tags).toHaveLength(0)
  })

  it('removeTag returns false without id', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    const ok = await s.removeTag(99)
    expect(ok).toBe(false)
  })

  it('removeTag removes on success', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    s.currentIR!.tags = [
      { id: 1, name: 'a' } as never,
      { id: 2, name: 'b' } as never,
    ]
    const ok = await s.removeTag(1)
    expect(ok).toBe(true)
    expect(s.currentIR?.tags.map(t => t.id)).toEqual([2])
  })

  it('removeTag returns false on API failure', async () => {
    vi.mocked(webapi.unassignIncidenceRateTag).mockResolvedValueOnce(false)
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    s.currentIR!.tags = [{ id: 1, name: 'foo' } as never]
    const ok = await s.removeTag(1)
    expect(ok).toBe(false)
    expect(s.currentIR?.tags).toHaveLength(1)
  })

  it('syncTags adds and removes diff', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.currentIR!.id = 7
    s.currentIR!.tags = [
      { id: 1, name: 'a' } as never,
      { id: 2, name: 'b' } as never,
    ]
    await s.syncTags([
      { id: 2, name: 'b' } as never,
      { id: 3, name: 'c' } as never,
    ])
    const ids = s.currentIR?.tags.map(t => t.id).sort()
    expect(ids).toEqual([2, 3])
  })

  it('syncTags is a no-op without id', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    await s.syncTags([{ id: 1, name: 'x' } as never])
    expect(s.currentIR?.tags).toEqual([])
  })
})

describe('incidence-rate store — UI state setters and computed', () => {
  it('setExecutionInfo writes per-source key', () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.setExecutionInfo('SYNPUF', { id: 1, status: 'COMPLETED' } as never)
    expect(s.executionInfoBySourceKey['SYNPUF']).toBeDefined()
    s.setExecutionInfo('OPTUM', { id: 2, status: 'STARTED' } as never)
    expect(Object.keys(s.executionInfoBySourceKey).sort()).toEqual(['OPTUM', 'SYNPUF'])
  })

  it('setSelectedSource updates selectedSourceKey', () => {
    const s = useIncidenceRateStore()
    s.setSelectedSource('SYNPUF')
    expect(s.selectedSourceKey).toBe('SYNPUF')
    s.setSelectedSource(null)
    expect(s.selectedSourceKey).toBeNull()
  })

  it('setSelectedTargetOutcome updates both', () => {
    const s = useIncidenceRateStore()
    s.setSelectedTargetOutcome(1, 2)
    expect(s.selectedTargetId).toBe(1)
    expect(s.selectedOutcomeId).toBe(2)
    s.setSelectedTargetOutcome(null, null)
    expect(s.selectedTargetId).toBeNull()
    expect(s.selectedOutcomeId).toBeNull()
  })

  it('setRateMultiplier updates the multiplier', () => {
    const s = useIncidenceRateStore()
    expect(s.rateMultiplier).toBe(1000)
    s.setRateMultiplier(100000 as never)
    expect(s.rateMultiplier).toBe(100000)
  })

  it('canSave is true when dirty + valid + not preview', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    await s.validateIR()
    expect(s.canSave).toBe(true)
  })

  it('canSave is false when not dirty', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    s.markClean()
    await s.validateIR()
    expect(s.canSave).toBe(false)
  })

  it('canGenerate requires id, no dirty, no errors, not preview', async () => {
    const s = useIncidenceRateStore()
    s.createNewIR()
    s.updateMeta({ name: 'X' })
    s.addTargetCohortId(1, 'A')
    s.addOutcomeCohortId(2, 'B')
    await s.validateIR()
    s.markClean()
    expect(s.canGenerate).toBe(false)

    s.currentIR!.id = 42
    expect(s.canGenerate).toBe(true)
  })

  it('canSave / canGenerate are false in preview mode', async () => {
    vi.mocked(versions.getIncidenceRateVersion).mockResolvedValueOnce({
      versionDTO: { assetId: 1, version: 1 } as never,
      entityDTO: {
        id: 1, name: 'V',
        expression: {
          ConceptSets: [], targetIds: [1], outcomeIds: [2],
          timeAtRisk: { start: { DateField: 'StartDate', Offset: 0 }, end: { DateField: 'EndDate', Offset: 0 } },
          strata: [],
        },
        tags: [],
      } as never,
    })
    const s = useIncidenceRateStore()
    await s.loadVersionPreview(1, 1)
    expect(s.isPreviewMode).toBe(true)
    expect(s.canSave).toBe(false)
    expect(s.canGenerate).toBe(false)
  })

  it('exposes RATE_MULTIPLIER_OPTIONS for convenience', () => {
    const s = useIncidenceRateStore()
    expect(Array.isArray(s.RATE_MULTIPLIER_OPTIONS)).toBe(true)
  })
})

describe('savePreviewAsCurrent', () => {
  it('PUTs the previewed IR and clears preview on success', async () => {
    const saveIncidenceRate = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 4, name: 'P' },
    })
    vi.doMock('@/services/webapi', () => ({ saveIncidenceRate }))

    const { useIncidenceRateStore } = await import('@/stores/incidence-rate')
    const store = useIncidenceRateStore()
    store.currentIR = { id: 4, name: 'P' } as never
    store.previewVersion = { version: 2 } as never

    expect(await store.savePreviewAsCurrent()).toBe(true)
    expect(saveIncidenceRate).toHaveBeenCalledWith(4, store.currentIR)
    expect(store.previewVersion).toBeNull()
  })

  it('keeps preview state when the server rejects the save', async () => {
    const saveIncidenceRate = vi.fn().mockResolvedValue({ success: false, error: 'nope' })
    vi.doMock('@/services/webapi', () => ({ saveIncidenceRate }))

    const { useIncidenceRateStore } = await import('@/stores/incidence-rate')
    const store = useIncidenceRateStore()
    store.currentIR = { id: 4, name: 'P' } as never
    store.previewVersion = { version: 2 } as never

    expect(await store.savePreviewAsCurrent()).toBe(false)
    expect(store.previewVersion).not.toBeNull()
  })

  it('refuses when not in preview mode', async () => {
    const { useIncidenceRateStore } = await import('@/stores/incidence-rate')
    const store = useIncidenceRateStore()
    store.currentIR = { id: 4, name: 'P' } as never

    expect(await store.savePreviewAsCurrent()).toBe(false)
  })
})

describe('useIncidenceRateStore — executions getter', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('returns an empty list when no executions are recorded', () => {
    const s = useIncidenceRateStore()
    expect(s.executions).toEqual([])
  })

  it('flattens executionInfoBySourceKey into a sorted list (newest first)', () => {
    const s = useIncidenceRateStore()
    s.setExecutionInfo('CCAE', {
      executionInfo: {
        id: { analysisId: 1, sourceId: 10 },
        status: 'COMPLETED',
        startTime: 1_000,
        executionDuration: 200,
      },
      summaryList: [],
    })
    s.setExecutionInfo('MDCD', {
      executionInfo: {
        id: { analysisId: 1, sourceId: 11 },
        status: 'STARTED',
        startTime: 2_000,
      },
      summaryList: [],
    })
    expect(s.executions).toEqual([
      {
        id: 11,
        sourceKey: 'MDCD',
        sourceId: 11,
        status: 'STARTED',
        startTime: 2_000,
        duration: null,
        message: null,
      },
      {
        id: 10,
        sourceKey: 'CCAE',
        sourceId: 10,
        status: 'COMPLETED',
        startTime: 1_000,
        duration: 200,
        message: null,
      },
    ])
  })

  it('looks up an execution by its id (== sourceId)', () => {
    const s = useIncidenceRateStore()
    s.setExecutionInfo('CCAE', {
      executionInfo: { id: { analysisId: 1, sourceId: 10 }, status: 'COMPLETED' },
      summaryList: [],
    })
    expect(s.executionById(10)?.sourceKey).toBe('CCAE')
    expect(s.executionById(99)).toBeNull()
  })
})
