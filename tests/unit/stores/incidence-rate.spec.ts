import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi', () => ({
  getIncidenceRate: vi.fn(),
  assignIncidenceRateTag: vi.fn().mockResolvedValue(true),
  unassignIncidenceRateTag: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/services/incidence-rate-versions.service', () => ({
  getIncidenceRateVersion: vi.fn(),
}))

import * as webapi from '@/services/webapi'
import * as versions from '@/services/incidence-rate-versions.service'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

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

    // TAR same DateField + end <= start = error
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
