import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathwayStore } from '@/stores/pathway'
import { PATHWAY_DEFAULTS, PATHWAY_AUTO_SAVE_INTERVAL_MS } from '@/models/pathway.types'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/webapi', () => ({
  getPathway: vi.fn().mockResolvedValue({
    success: true,
    data: {
      id: 1, name: 'X', tags: [],
      targetCohorts: [], eventCohorts: [],
      combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
    },
  }),
  existsPathway: vi.fn().mockResolvedValue({ success: true, data: 0 }),
  assignPathwayTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignPathwayTag: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/pathway-versions.service', () => ({
  getPathwayVersion: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('pathway store — basics', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('createNewPathway initializes with defaults and not dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    expect(s.currentPathway?.name).toBe('')
    expect(s.currentPathway?.combinationWindow).toBe(PATHWAY_DEFAULTS.combinationWindow)
    expect(s.isDirty).toBe(false)
  })

  it('updateDesign merges and marks dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateDesign({ maxDepth: 7 })
    expect(s.currentPathway?.maxDepth).toBe(7)
    expect(s.isDirty).toBe(true)
  })

  it('addTargetCohort appends and dedupes by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.addTargetCohort({ id: 1, name: 'A duplicate' })
    expect(s.currentPathway?.targetCohorts).toHaveLength(1)
  })

  it('removeEventCohort drops by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addEventCohort({ id: 1, name: 'A' })
    s.addEventCohort({ id: 2, name: 'B' })
    s.removeEventCohort(1)
    expect(s.currentPathway?.eventCohorts.map(c => c.id)).toEqual([2])
  })

  it('renameTargetCohort updates the label only', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.renameTargetCohort(1, 'Better label')
    expect(s.currentPathway?.targetCohorts[0].name).toBe('Better label')
  })

  it('loadPathway populates currentPathway and clears dirty', async () => {
    const s = usePathwayStore()
    await s.loadPathway(1)
    expect(s.currentPathway?.id).toBe(1)
    expect(s.isDirty).toBe(false)
  })

  it('markClean resets dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.markDirty()
    expect(s.isDirty).toBe(true)
    s.markClean()
    expect(s.isDirty).toBe(false)
  })
})

describe('pathway store — auto-save', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  it('saveToDraft writes the current pathway to sessionStorage', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Drafty' })
    s.saveToDraft()
    const raw = sessionStorage.getItem('atlas3_pathway_draft')
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed.pathway.name).toBe('Drafty')
    expect(typeof parsed.timestamp).toBe('string')
  })

  it('restoreFromDraft loads the draft and marks dirty', () => {
    sessionStorage.setItem('atlas3_pathway_draft', JSON.stringify({
      pathway: {
        name: 'From draft', tags: [],
        targetCohorts: [], eventCohorts: [],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      },
      timestamp: new Date().toISOString(),
    }))
    const s = usePathwayStore()
    expect(s.restoreFromDraft()).toBe(true)
    expect(s.currentPathway?.name).toBe('From draft')
    expect(s.isDirty).toBe(true)
  })

  it('clearDraft removes sessionStorage entry', () => {
    sessionStorage.setItem('atlas3_pathway_draft', '{"x":1}')
    const s = usePathwayStore()
    s.clearDraft()
    expect(sessionStorage.getItem('atlas3_pathway_draft')).toBeNull()
  })
})

describe('pathway store — validation', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('validatePathway flags empty name as error', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    await s.validatePathway()
    expect(s.validationErrors.some(e => e.field === 'name' && e.severity === 'error'))
      .toBe(true)
  })

  it('validatePathway flags missing target cohorts', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Has name' })
    await s.validatePathway()
    expect(s.validationErrors.some(e => e.field === 'targetCohorts')).toBe(true)
  })

  it('validatePathway flags missing event cohorts', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Has name' })
    s.addTargetCohort({ id: 1, name: 'T' })
    await s.validatePathway()
    expect(s.validationErrors.some(e => e.field === 'eventCohorts')).toBe(true)
  })

  it('validatePathway passes for a complete design', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Complete' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    await s.validatePathway()
    expect(s.hasErrors).toBe(false)
  })

  it('canSave is false when not dirty', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'X' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    s.markClean()
    await s.validatePathway()
    expect(s.canSave).toBe(false)
  })

  it('validatePathway flags maxDepth < 1', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'M' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    s.updateDesign({ maxDepth: 0 })
    await s.validatePathway()
    expect(s.validationErrors.some(e => e.field === 'maxDepth' && e.severity === 'error')).toBe(true)
  })

  it('validatePathway flags minCellCount < 1 as warning', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'M' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    s.updateDesign({ minCellCount: 0 })
    await s.validatePathway()
    expect(s.validationErrors.some(e => e.field === 'minCellCount' && e.severity === 'warning')).toBe(true)
    // hasErrors is only true for severity === 'error'; warnings don't trigger it
    expect(s.hasErrors).toBe(false)
  })

  it('validatePathway with no current pathway clears errors', async () => {
    const s = usePathwayStore()
    s.validationErrors = [
      { field: 'name', message: 'old', severity: 'error' },
    ]
    await s.validatePathway()
    expect(s.validationErrors).toEqual([])
  })
})

describe('pathway store — design mutators (extended)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('removeTargetCohort drops by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.addTargetCohort({ id: 2, name: 'B' })
    s.removeTargetCohort(1)
    expect(s.currentPathway?.targetCohorts.map(c => c.id)).toEqual([2])
  })

  it('renameEventCohort updates the label only', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addEventCohort({ id: 1, name: 'A' })
    s.renameEventCohort(1, 'Better')
    expect(s.currentPathway?.eventCohorts[0].name).toBe('Better')
  })

  it('addEventCohort dedupes by id', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addEventCohort({ id: 1, name: 'A' })
    s.addEventCohort({ id: 1, name: 'A duplicate' })
    expect(s.currentPathway?.eventCohorts).toHaveLength(1)
  })

  it('mutators no-op when currentPathway is null', () => {
    const s = usePathwayStore()
    // currentPathway is null; mutators should not throw
    s.updateDesign({ maxDepth: 9 })
    s.updateMeta({ name: 'foo' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.removeTargetCohort(1)
    s.renameTargetCohort(1, 'name')
    s.addEventCohort({ id: 1, name: 'E' })
    s.removeEventCohort(1)
    s.renameEventCohort(1, 'foo')
    expect(s.currentPathway).toBeNull()
    expect(s.isDirty).toBe(false)
  })

  it('renameTargetCohort no-ops when id not found', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addTargetCohort({ id: 1, name: 'A' })
    s.markClean()
    s.renameTargetCohort(999, 'nope')
    expect(s.isDirty).toBe(false)
  })

  it('renameEventCohort no-ops when id not found', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.addEventCohort({ id: 1, name: 'A' })
    s.markClean()
    s.renameEventCohort(999, 'nope')
    expect(s.isDirty).toBe(false)
  })
})

describe('pathway store — load/preview lifecycle', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.getPathway).mockResolvedValue({
      success: true,
      data: {
        id: 1, name: 'Loaded', tags: [],
        targetCohorts: [], eventCohorts: [],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      },
    } as never)
  })

  it('loadPathway returns false on failure and logs', async () => {
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.getPathway).mockResolvedValueOnce({
      success: false,
      error: 'not found',
    } as never)
    const s = usePathwayStore()
    const ok = await s.loadPathway(1)
    expect(ok).toBe(false)
    expect(s.currentPathway).toBeNull()
  })

  it('loadVersionPreview sets previewVersion on success', async () => {
    const versions = await import('@/services/pathway-versions.service')
    vi.mocked(versions.getPathwayVersion).mockResolvedValueOnce({
      versionDTO: { assetId: 1, version: 3 } as never,
      entityDTO: {
        id: 1, name: 'Versioned', tags: [],
        targetCohorts: [], eventCohorts: [],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      } as never,
    })
    const s = usePathwayStore()
    const ok = await s.loadVersionPreview(1, 3)
    expect(ok).toBe(true)
    expect(s.isPreviewMode).toBe(true)
    expect(s.currentPathway?.name).toBe('Versioned')
    await s.clearPreviewVersion()
    expect(s.isPreviewMode).toBe(false)
    expect(s.currentPathway?.name).toBe('Loaded')
  })

  it('loadVersionPreview returns false on exception', async () => {
    const versions = await import('@/services/pathway-versions.service')
    vi.mocked(versions.getPathwayVersion).mockRejectedValueOnce(new Error('boom'))
    const s = usePathwayStore()
    const ok = await s.loadVersionPreview(1, 3)
    expect(ok).toBe(false)
  })
})

describe('pathway store — draft error paths', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('saveToDraft no-ops when currentPathway is null', () => {
    const s = usePathwayStore()
    s.saveToDraft()
    expect(s.lastAutoSave).toBeNull()
    expect(sessionStorage.getItem('atlas3_pathway_draft')).toBeNull()
  })

  it('saveToDraft swallows sessionStorage errors', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    const original = Storage.prototype.setItem
    Storage.prototype.setItem = function () {
      throw new Error('quota exceeded')
    }
    try {
      expect(() => s.saveToDraft()).not.toThrow()
    } finally {
      Storage.prototype.setItem = original
    }
  })

  it('restoreFromDraft returns false when no draft exists', () => {
    const s = usePathwayStore()
    expect(s.restoreFromDraft()).toBe(false)
  })

  it('restoreFromDraft returns false on parse error', () => {
    sessionStorage.setItem('atlas3_pathway_draft', 'not json')
    const s = usePathwayStore()
    expect(s.restoreFromDraft()).toBe(false)
  })

  it('clearDraft swallows sessionStorage errors', () => {
    const original = Storage.prototype.removeItem
    Storage.prototype.removeItem = function () {
      throw new Error('boom')
    }
    try {
      const s = usePathwayStore()
      expect(() => s.clearDraft()).not.toThrow()
    } finally {
      Storage.prototype.removeItem = original
    }
  })
})

describe('pathway store — auto-save timer', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    sessionStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('startAutoSave persists draft when dirty after interval', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Draft' })
    s.startAutoSave()

    vi.advanceTimersByTime(PATHWAY_AUTO_SAVE_INTERVAL_MS + 100)

    const raw = sessionStorage.getItem('atlas3_pathway_draft')
    expect(raw).not.toBeNull()
    s.stopAutoSave()
  })

  it('startAutoSave does not persist when not dirty', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.markClean()
    s.startAutoSave()

    vi.advanceTimersByTime(PATHWAY_AUTO_SAVE_INTERVAL_MS + 100)

    expect(sessionStorage.getItem('atlas3_pathway_draft')).toBeNull()
    s.stopAutoSave()
  })

  it('stopAutoSave is idempotent', () => {
    const s = usePathwayStore()
    expect(() => {
      s.stopAutoSave()
      s.stopAutoSave()
    }).not.toThrow()
  })

  it('startAutoSave clears any prior timer', () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'Z' })
    s.startAutoSave()
    s.startAutoSave() // should not stack timers
    vi.advanceTimersByTime(PATHWAY_AUTO_SAVE_INTERVAL_MS + 100)
    s.stopAutoSave()
  })
})

describe('pathway store — tags', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.assignPathwayTag).mockResolvedValue({ success: true, data: undefined })
    vi.mocked(webapi.unassignPathwayTag).mockResolvedValue({ success: true, data: undefined })
  })

  it('addTag returns false when no pathway id', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(false)
  })

  it('addTag does not mark dirty (metadata)', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    s.markClean()
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(true)
    expect(s.currentPathway?.tags.map(t => t.name)).toEqual(['covid'])
    expect(s.isDirty).toBe(false)
  })

  it('addTag does not double-add same tag', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    s.currentPathway!.tags = [{ id: 1, name: 'covid' } as never]
    const ok = await s.addTag({ id: 1, name: 'covid' } as never)
    expect(ok).toBe(true)
    expect(s.currentPathway?.tags).toHaveLength(1)
  })

  it('addTag returns false when API call fails (does not push)', async () => {
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.assignPathwayTag).mockResolvedValueOnce({
      success: false,
      error: new ApiError('conflict', 409, null),
    })
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    const ok = await s.addTag({ id: 1, name: 'foo' } as never)
    expect(ok).toBe(false)
    expect(s.currentPathway?.tags).toHaveLength(0)
  })

  it('removeTag returns false when no pathway id', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    const ok = await s.removeTag(99)
    expect(ok).toBe(false)
  })

  it('removeTag removes tag on success', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    s.currentPathway!.tags = [
      { id: 1, name: 'a' } as never,
      { id: 2, name: 'b' } as never,
    ]
    const ok = await s.removeTag(1)
    expect(ok).toBe(true)
    expect(s.currentPathway?.tags.map(t => t.id)).toEqual([2])
  })

  it('removeTag returns false on API failure', async () => {
    const webapi = await import('@/services/webapi')
    vi.mocked(webapi.unassignPathwayTag).mockResolvedValueOnce({
      success: false,
      error: new ApiError('conflict', 409, null),
    })
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    s.currentPathway!.tags = [{ id: 1, name: 'foo' } as never]
    const ok = await s.removeTag(1)
    expect(ok).toBe(false)
    expect(s.currentPathway?.tags).toHaveLength(1)
  })

  it('syncTags adds and removes diff', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.currentPathway!.id = 7
    s.currentPathway!.tags = [
      { id: 1, name: 'a' } as never,
      { id: 2, name: 'b' } as never,
    ]
    await s.syncTags([
      { id: 2, name: 'b' } as never,
      { id: 3, name: 'c' } as never,
    ])
    const ids = s.currentPathway?.tags.map(t => t.id).sort()
    expect(ids).toEqual([2, 3])
  })

  it('syncTags is a no-op when no pathway id', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    await s.syncTags([{ id: 1, name: 'x' } as never])
    expect(s.currentPathway?.tags).toEqual([])
  })
})

describe('pathway store — canSave / canGenerate', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('canGenerate requires id and not dirty and no errors', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'X' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    await s.validatePathway()
    s.markClean()
    // No id yet → canGenerate is false
    expect(s.canGenerate).toBe(false)

    s.currentPathway!.id = 42
    expect(s.canGenerate).toBe(true)
  })

  it('canSave is true when dirty + valid + not preview', async () => {
    const s = usePathwayStore()
    s.createNewPathway()
    s.updateMeta({ name: 'X' })
    s.addTargetCohort({ id: 1, name: 'T' })
    s.addEventCohort({ id: 2, name: 'E' })
    await s.validatePathway()
    expect(s.canSave).toBe(true)
  })

  it('canGenerate is false in preview mode', async () => {
    const versions = await import('@/services/pathway-versions.service')
    vi.mocked(versions.getPathwayVersion).mockResolvedValueOnce({
      versionDTO: { assetId: 1, version: 1 } as never,
      entityDTO: {
        id: 1, name: 'V', tags: [],
        targetCohorts: [{ id: 1, name: 'T' }],
        eventCohorts: [{ id: 2, name: 'E' }],
        combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
      } as never,
    })
    const s = usePathwayStore()
    await s.loadVersionPreview(1, 1)
    expect(s.isPreviewMode).toBe(true)
    expect(s.canSave).toBe(false)
    expect(s.canGenerate).toBe(false)
  })
})

describe('savePreviewAsCurrent', () => {
  it('PUTs the previewed pathway and clears preview on success', async () => {
    const savePathway = vi.fn().mockResolvedValue({
      success: true,
      data: { id: 4, name: 'P' },
    })
    vi.doMock('@/services/webapi', () => ({ savePathway }))

    const { usePathwayStore } = await import('@/stores/pathway')
    const store = usePathwayStore()
    store.currentPathway = { id: 4, name: 'P' } as never
    store.previewVersion = { version: 2 } as never

    expect(await store.savePreviewAsCurrent()).toBe(true)
    expect(savePathway).toHaveBeenCalledWith(4, store.currentPathway)
    expect(store.previewVersion).toBeNull()
  })

  it('keeps preview state when the server rejects the save', async () => {
    const savePathway = vi.fn().mockResolvedValue({ success: false, error: 'nope' })
    vi.doMock('@/services/webapi', () => ({ savePathway }))

    const { usePathwayStore } = await import('@/stores/pathway')
    const store = usePathwayStore()
    store.currentPathway = { id: 4, name: 'P' } as never
    store.previewVersion = { version: 2 } as never

    expect(await store.savePreviewAsCurrent()).toBe(false)
    expect(store.previewVersion).not.toBeNull()
  })

  it('refuses when not in preview mode', async () => {
    const { usePathwayStore } = await import('@/stores/pathway')
    const store = usePathwayStore()
    store.currentPathway = { id: 4, name: 'P' } as never

    expect(await store.savePreviewAsCurrent()).toBe(false)
  })
})
