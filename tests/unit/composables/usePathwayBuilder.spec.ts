import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathwayBuilder } from '@/composables/usePathwayBuilder'
import { usePathwayStore } from '@/stores/pathway'
import * as webapi from '@/services/webapi'

vi.mock('@/services/webapi')
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))

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
    vi.mocked(webapi.deletePathway).mockResolvedValue(true)
    const { remove } = usePathwayBuilder()
    const ok = await remove()
    expect(webapi.deletePathway).toHaveBeenCalledWith(5)
    expect(ok).toBe(true)
  })
})
