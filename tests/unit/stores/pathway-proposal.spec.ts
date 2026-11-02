import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { PATHWAY_AUTO_SAVE_INTERVAL_MS } from '@/models/pathway.types'
import type { Pathway } from '@/models/pathway.types'
import { useI18n } from '@/composables/useI18n'
import { logger } from '@/utils/logger'
import * as pathwayService from '@/services/pathway.service'
import * as versionsService from '@/services/pathway-versions.service'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/pathway.service', () => ({
  getPathway: vi.fn(),
  savePathway: vi.fn(),
  assignPathwayTag: vi.fn(),
  unassignPathwayTag: vi.fn(),
}))

vi.mock('@/services/pathway-versions.service', () => ({
  getPathwayVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const DRAFT_KEY = 'atlas3_pathway_draft'

function loaded(overrides: Partial<Pathway> = {}): Pathway {
  return {
    id: 1,
    name: 'Loaded',
    description: '',
    tags: [],
    targetCohorts: [],
    eventCohorts: [],
    combinationWindow: 30,
    minCellCount: 5,
    maxDepth: 5,
    allowRepeats: false,
    ...overrides,
  }
}

function completePathway(store: ReturnType<typeof usePathwayStore>) {
  store.createNewPathway()
  store.updateMeta({ name: 'Complete' })
  store.addTargetCohort({ id: 1, name: 'T' })
  store.addEventCohort({ id: 2, name: 'E' })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  sessionStorage.clear()
  vi.mocked(pathwayService.getPathway).mockResolvedValue({ success: true, data: loaded() } as never)
  vi.mocked(pathwayService.assignPathwayTag).mockResolvedValue({ success: true, data: undefined })
  vi.mocked(pathwayService.unassignPathwayTag).mockResolvedValue({ success: true, data: undefined })
})

describe('pathway store initial state and reset', () => {
  it('starts empty, editable and without errors', () => {
    const s = usePathwayStore()
    expect(s.validationErrors).toEqual([])
    expect(s.isReadOnly).toBe(false)
    expect(s.currentPathway).toBeNull()
  })

  it('createNewPathway starts with an empty description', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.currentPathway?.description).toBe('')
  })

  it('setPathway clears previous validation errors', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    await s.validatePathway()
    expect(s.validationErrors.length).toBeGreaterThan(0)
    s.setPathway(loaded())
    expect(s.validationErrors).toEqual([])
  })
})

describe('pathway store loading', () => {
  it('loadPathway returns true and leaves the pathway editable', async () => {
    const s = usePathwayStore()
    s.isReadOnly = true
    expect(await s.loadPathway(1)).toBe(true)
    expect(s.isReadOnly).toBe(false)
    expect(pathwayService.getPathway).toHaveBeenCalledWith(1)
  })

  it('loadVersionPreview resets dirty and read-only flags', async () => {
    vi.mocked(versionsService.getPathwayVersion).mockResolvedValueOnce({
      versionDTO: { assetId: 1, version: 2 } as never,
      entityDTO: loaded({ name: 'V2' }) as never,
    })
    const s = usePathwayStore()
    s.createNewPathway()
    s.markDirty()
    s.isReadOnly = true
    expect(await s.loadVersionPreview(1, 2)).toBe(true)
    expect(s.isDirty).toBe(false)
    expect(s.isReadOnly).toBe(false)
  })

  it('clearPreviewVersion without a saved id clears preview without reloading', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.previewVersion = { version: 1 } as never
    await s.clearPreviewVersion()
    expect(s.previewVersion).toBeNull()
    expect(s.currentPathway?.name).toBe('')
    expect(pathwayService.getPathway).not.toHaveBeenCalled()
  })

  it('clearPreviewVersion tolerates no current pathway', async () => {
    const s = usePathwayStore()
    s.previewVersion = { version: 1 } as never
    await expect(s.clearPreviewVersion()).resolves.toBeUndefined()
    expect(s.previewVersion).toBeNull()
  })
})

describe('savePreviewAsCurrent', () => {
  it('saves the previewed pathway and leaves preview mode', async () => {
    vi.mocked(pathwayService.savePathway).mockResolvedValueOnce({ success: true, data: loaded() } as never)
    const s = usePathwayStore()
    s.currentPathway = loaded({ id: 4 })
    s.previewVersion = { version: 2 } as never
    expect(await s.savePreviewAsCurrent()).toBe(true)
    expect(pathwayService.savePathway).toHaveBeenCalledWith(4, s.currentPathway)
    expect(s.previewVersion).toBeNull()
  })

  it('refuses without a preview version and logs', async () => {
    const s = usePathwayStore()
    s.currentPathway = loaded({ id: 4 })
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(pathwayService.savePathway).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalled()
  })

  it('refuses when the previewed pathway has no id', async () => {
    const s = usePathwayStore()
    s.currentPathway = loaded({ id: undefined })
    s.previewVersion = { version: 2 } as never
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(pathwayService.savePathway).not.toHaveBeenCalled()
  })

  it('returns false and keeps preview when saving throws', async () => {
    vi.mocked(pathwayService.savePathway).mockRejectedValueOnce(new Error('network'))
    const s = usePathwayStore()
    s.currentPathway = loaded({ id: 4 })
    s.previewVersion = { version: 2 } as never
    expect(await s.savePreviewAsCurrent()).toBe(false)
    expect(s.previewVersion).not.toBeNull()
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('pathway drafts', () => {
  afterEach(() => vi.restoreAllMocks())

  it('logs when the draft cannot be written', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    s.saveToDraft()
    expect(s.lastAutoSave).toBeNull()
    expect(logger.error).toHaveBeenCalled()
  })

  it('returns false without logging when no draft exists', () => {
    const s = usePathwayStore()
    expect(s.restoreFromDraft()).toBe(false)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs when the draft cannot be removed', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('denied')
    })
    usePathwayStore().clearDraft()
    expect(logger.error).toHaveBeenCalled()
  })
})

describe('pathway auto-save stop', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('stopAutoSave stops further draft writes', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Draft' })
    s.startAutoSave()
    s.stopAutoSave()
    vi.advanceTimersByTime(PATHWAY_AUTO_SAVE_INTERVAL_MS * 2)
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull()
  })
})

describe('pathway validation details', () => {
  it('reports exact error entries for an empty pathway', async () => {
    const { tv } = useI18n()
    const s = usePathwayStore()
    s.createNewPathway()
    await s.validatePathway()
    expect(s.validationErrors).toEqual([
      { field: 'name', message: tv('commonErrors.nameRequired'), severity: 'error' },
      { field: 'targetCohorts', message: tv('pathway.validation.targetRequired'), severity: 'error' },
      { field: 'eventCohorts', message: tv('pathway.validation.eventRequired'), severity: 'error' },
    ])
    expect(s.validationErrors.map(e => e.message)).not.toContain('')
  })

  it('treats a whitespace-only name as missing', async () => {
    const s = usePathwayStore()
    completePathway(s)
    s.updateMeta({ name: '   ' })
    await s.validatePathway()
    expect(s.validationErrors.map(e => e.field)).toEqual(['name'])
  })

  it('has no errors at all for a complete design', async () => {
    const s = usePathwayStore()
    completePathway(s)
    await s.validatePathway()
    expect(s.validationErrors).toEqual([])
  })

  it('accepts the minimum value 1 for maxDepth and minCellCount', async () => {
    const s = usePathwayStore()
    completePathway(s)
    s.updateDesign({ maxDepth: 1, minCellCount: 1 })
    await s.validatePathway()
    expect(s.validationErrors).toEqual([])
  })

  it('interpolates the minimum into maxDepth and minCellCount messages', async () => {
    const { tv } = useI18n()
    const s = usePathwayStore()
    completePathway(s)
    s.updateDesign({ maxDepth: 0, minCellCount: 0 })
    await s.validatePathway()
    expect(s.validationErrors).toEqual([
      { field: 'maxDepth', message: tv('pathway.validation.maxDepthMin', { min: 1 }), severity: 'error' },
      {
        field: 'minCellCount',
        message: tv('pathway.validation.minCellCountMin', { min: 1 }),
        severity: 'warning',
      },
    ])
    expect(s.validationErrors[0].message).toBe('Max depth must be at least 1')
    expect(s.validationErrors[1].message).toBe('Min cell count must be at least 1')
  })
})

describe('pathway tags guards', () => {
  it('addTag and removeTag return false with no current pathway', async () => {
    const s = usePathwayStore()
    expect(await s.addTag({ id: 1, name: 'a' } as never)).toBe(false)
    expect(await s.removeTag(1)).toBe(false)
    expect(await s.syncTags([])).toBe(false)
  })

  it('syncTags returns false and calls no service without an id', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(await s.syncTags([{ id: 1, name: 'x' } as never])).toBe(false)
    expect(pathwayService.assignPathwayTag).not.toHaveBeenCalled()
  })

  it('logs only when tag synchronization fails', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    await s.syncTags([{ id: 1, name: 'ok' } as never])
    expect(logger.error).not.toHaveBeenCalled()
    vi.mocked(pathwayService.assignPathwayTag).mockResolvedValueOnce({
      success: false,
      error: new ApiError('conflict', 409, null),
    })
    expect(await s.syncTags([{ id: 1, name: 'ok' } as never, { id: 2, name: 'bad' } as never])).toBe(false)
    expect(logger.error).toHaveBeenCalledTimes(1)
  })
})

describe('canGenerate', () => {
  it('is false with no pathway', () => {
    expect(usePathwayStore().canGenerate).toBe(false)
  })

  it('is false while there are unsaved changes', async () => {
    const s = usePathwayStore()
    completePathway(s)
    s.currentPathway!.id = 42
    await s.validatePathway()
    expect(s.isDirty).toBe(true)
    expect(s.canGenerate).toBe(false)
  })

  it('is false when saved but invalid', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 42
    await s.validatePathway()
    s.markClean()
    expect(s.canGenerate).toBe(false)
  })
})

describe('applyProposal', () => {
  it('returns false and does nothing without a current pathway', () => {
    const s = usePathwayStore()
    expect(s.applyProposal({ name: 'X' })).toBe(false)
    expect(s.currentPathway).toBeNull()
  })

  it('returns false for an empty payload and stays clean', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.applyProposal({})).toBe(false)
    expect(s.isDirty).toBe(false)
  })

  it('applies name and description', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.applyProposal({ name: 'New', description: 'Desc' })).toBe(true)
    expect(s.currentPathway?.name).toBe('New')
    expect(s.currentPathway?.description).toBe('Desc')
    expect(s.isDirty).toBe(true)
  })

  it('ignores a blank name', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Keep' })
    s.markClean()
    expect(s.applyProposal({ name: '   ' })).toBe(false)
    expect(s.currentPathway?.name).toBe('Keep')
    expect(s.isDirty).toBe(false)
  })

  it('applies an empty description on its own', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ description: 'old' })
    s.markClean()
    expect(s.applyProposal({ description: '' })).toBe(true)
    expect(s.currentPathway?.description).toBe('')
    expect(s.isDirty).toBe(true)
  })

  it('ignores non-string meta and non-numeric design values', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    const before = { ...s.currentPathway! }
    const applied = s.applyProposal({
      name: 5,
      description: null,
      combinationWindow: '10',
      minCellCount: '3',
      maxDepth: '2',
      allowRepeats: 'yes',
    } as never)
    expect(applied).toBe(false)
    expect(s.currentPathway).toEqual(before)
    expect(s.isDirty).toBe(false)
  })

  it.each([
    ['combinationWindow', 14],
    ['minCellCount', 0],
    ['maxDepth', 3],
    ['allowRepeats', true],
    ['allowRepeats', false],
  ] as const)('applies %s = %s', (field, value) => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway![field as 'allowRepeats'] = (typeof value === 'boolean' ? !value : 999) as never
    s.markClean()
    expect(s.applyProposal({ [field]: value })).toBe(true)
    expect(s.currentPathway?.[field]).toBe(value)
    expect(s.isDirty).toBe(true)
  })

  it('applies all design fields together without touching others', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Keep' })
    s.applyProposal({ combinationWindow: 1, minCellCount: 2, maxDepth: 3, allowRepeats: true })
    expect(s.currentPathway).toMatchObject({
      name: 'Keep',
      combinationWindow: 1,
      minCellCount: 2,
      maxDepth: 3,
      allowRepeats: true,
    })
  })

  it('replaces target and event cohorts', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'Old T' })
    s.addEventCohort({ id: 2, name: 'Old E' })
    s.markClean()
    const applied = s.applyProposal({
      targetCohorts: [{ id: 10, name: 'T' }],
      targetCohortsToAdd: [{ id: 11, name: 'ignored' }],
      eventCohorts: [{ id: 20, name: 'E' }],
      eventCohortsToAdd: [{ id: 21, name: 'ignored' }],
    })
    expect(applied).toBe(true)
    expect(s.currentPathway?.targetCohorts).toEqual([{ id: 10, name: 'T' }])
    expect(s.currentPathway?.eventCohorts).toEqual([{ id: 20, name: 'E' }])
    expect(s.isDirty).toBe(true)
  })

  it('replacing with an empty list still counts as applied', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'T' })
    s.markClean()
    expect(s.applyProposal({ targetCohorts: [] })).toBe(true)
    expect(s.currentPathway?.targetCohorts).toEqual([])
    expect(s.isDirty).toBe(true)
  })

  it('replacing event cohorts alone counts as applied', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.markClean()
    expect(s.applyProposal({ eventCohorts: [{ id: 3, name: 'E' }] })).toBe(true)
    expect(s.currentPathway?.eventCohorts).toEqual([{ id: 3, name: 'E' }])
    expect(s.isDirty).toBe(true)
  })

  it('appends target and event cohorts without duplicates', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'T1' })
    s.addEventCohort({ id: 2, name: 'E1' })
    expect(
      s.applyProposal({
        targetCohortsToAdd: [{ id: 1, name: 'dup' }, { id: 3, name: 'T3' }],
        eventCohortsToAdd: [{ id: 2, name: 'dup' }, { id: 4, name: 'E4' }],
      })
    ).toBe(true)
    expect(s.currentPathway?.targetCohorts.map(c => c.id)).toEqual([1, 3])
    expect(s.currentPathway?.eventCohorts.map(c => c.id)).toEqual([2, 4])
  })

  it('appending only targets counts as applied', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.applyProposal({ targetCohortsToAdd: [{ id: 5, name: 'T' }] })).toBe(true)
    expect(s.currentPathway?.targetCohorts).toEqual([{ id: 5, name: 'T' }])
  })

  it('appending only events counts as applied', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.applyProposal({ eventCohortsToAdd: [{ id: 6, name: 'E' }] })).toBe(true)
    expect(s.currentPathway?.eventCohorts).toEqual([{ id: 6, name: 'E' }])
  })

  it('empty add lists are not applied', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.applyProposal({ targetCohortsToAdd: [], eventCohortsToAdd: [] })).toBe(false)
    expect(s.isDirty).toBe(false)
  })
})
