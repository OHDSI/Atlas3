import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi')
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
const routerPushMock = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPushMock }) }))

let webapi: typeof import('@/services/webapi')
let usePathwayBuilder: typeof import('@/composables/usePathwayBuilder').usePathwayBuilder
let usePathwayStore: typeof import('@/stores/pathway').usePathwayStore

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  ;({ usePathwayBuilder } = await import('@/composables/usePathwayBuilder'))
  ;({ usePathwayStore } = await import('@/stores/pathway'))
})

describe('usePathwayBuilder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('save calls createPathway when no id', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    store.updateMeta({ name: 'New' })
    store.addTargetCohort({ id: 1, name: 'T' })
    store.addEventCohort({ id: 2, name: 'E' })
    await store.validatePathway()

    vi.mocked(webapi.createPathway).mockResolvedValue({
      success: true,
      data: { ...store.currentPathway!, id: 99 },
    })

    const { save } = usePathwayBuilder()
    const result = await save()
    expect(webapi.createPathway).toHaveBeenCalled()
    expect(result?.id).toBe(99)
    expect(store.isDirty).toBe(false)
  })

  it('save calls savePathway when id present', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 5
    store.updateMeta({ name: 'Existing' })
    store.addTargetCohort({ id: 1, name: 'T' })
    store.addEventCohort({ id: 2, name: 'E' })
    await store.validatePathway()

    vi.mocked(webapi.savePathway).mockResolvedValue({
      success: true,
      data: store.currentPathway!,
    })

    const { save } = usePathwayBuilder()
    await save()
    expect(webapi.savePathway).toHaveBeenCalledWith(5, expect.anything())
  })

  it('copy delegates to copyPathway and returns new id', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 5
    vi.mocked(webapi.copyPathway).mockResolvedValue({
      success: true,
      data: { ...store.currentPathway!, id: 12 },
    })
    const { copy } = usePathwayBuilder()
    const out = await copy()
    expect(webapi.copyPathway).toHaveBeenCalledWith(5)
    expect(out?.id).toBe(12)
  })

  it('remove delegates to deletePathway', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 5
    vi.mocked(webapi.deletePathway).mockResolvedValue({ success: true, data: undefined })
    const { remove } = usePathwayBuilder()
    const ok = await remove()
    expect(webapi.deletePathway).toHaveBeenCalledWith(5)
    expect(ok).toBe(true)
  })

  it('save returns null when there is no currentPathway', async () => {
    const { save } = usePathwayBuilder()
    const result = await save()
    expect(result).toBeNull()
    expect(webapi.createPathway).not.toHaveBeenCalled()
    expect(webapi.savePathway).not.toHaveBeenCalled()
  })

  it('save blocks and notifies when validation errors exist', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    // No target/event cohorts — validatePathway() will populate errors
    await store.validatePathway()
    expect(store.hasErrors).toBe(true)

    const { save, feedback } = usePathwayBuilder()
    const result = await save()

    expect(result).toBeNull()
    expect(webapi.createPathway).not.toHaveBeenCalled()
    expect(webapi.savePathway).not.toHaveBeenCalled()
    expect(feedback.value?.color).toBe('error')
    expect(feedback.value?.message).toMatch(/Cannot save/)
  })

  it('save reports save failure via feedback', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    store.updateMeta({ name: 'NewFail' })
    store.addTargetCohort({ id: 1, name: 'T' })
    store.addEventCohort({ id: 2, name: 'E' })
    await store.validatePathway()

    vi.mocked(webapi.createPathway).mockResolvedValue({
      success: false,
      error: 'server exploded',
    })

    const { save, feedback } = usePathwayBuilder()
    const result = await save()
    expect(result).toBeNull()
    expect(feedback.value?.color).toBe('error')
    expect(feedback.value?.message).toContain('server exploded')
  })

  it('save navigates to /pathways/:id when creating a brand-new pathway', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    store.updateMeta({ name: 'New' })
    store.addTargetCohort({ id: 1, name: 'T' })
    store.addEventCohort({ id: 2, name: 'E' })
    await store.validatePathway()

    vi.mocked(webapi.createPathway).mockResolvedValue({
      success: true,
      data: { ...store.currentPathway!, id: 77 },
    })

    routerPushMock.mockClear()
    const { save, feedback } = usePathwayBuilder()
    await save()
    expect(routerPushMock).toHaveBeenCalledWith('/pathways/77')
    expect(feedback.value?.color).toBe('success')
  })

  it('copy returns null when no current pathway id', async () => {
    const { copy } = usePathwayBuilder()
    const out = await copy()
    expect(out).toBeNull()
    expect(webapi.copyPathway).not.toHaveBeenCalled()
  })

  it('copy reports failure via feedback', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 5
    vi.mocked(webapi.copyPathway).mockResolvedValue({
      success: false,
      error: 'cannot copy',
    })

    const { copy, feedback } = usePathwayBuilder()
    const out = await copy()
    expect(out).toBeNull()
    expect(feedback.value?.color).toBe('error')
    expect(feedback.value?.message).toContain('cannot copy')
  })

  it('remove returns false when no current pathway id', async () => {
    const { remove } = usePathwayBuilder()
    const ok = await remove()
    expect(ok).toBe(false)
    expect(webapi.deletePathway).not.toHaveBeenCalled()
  })

  it('remove reports failure via feedback when deletePathway returns false', async () => {
    const store = usePathwayStore()
    store.createNewPathway()
    if (store.currentPathway) store.currentPathway.id = 5
    vi.mocked(webapi.deletePathway).mockResolvedValue({
      success: false,
      error: { message: 'conflict' } as never,
    })

    const { remove, feedback } = usePathwayBuilder()
    const ok = await remove()
    expect(ok).toBe(false)
    expect(feedback.value?.color).toBe('error')
    expect(feedback.value?.message).toBe('Delete failed: conflict')
  })
})
