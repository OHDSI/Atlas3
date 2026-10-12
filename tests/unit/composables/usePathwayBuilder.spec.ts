import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import * as webapi from '@/services/pathway.service'
import { usePathwayBuilder } from '@/composables/usePathwayBuilder'
import { usePathwayStore } from '@/stores/pathway'
import { ApiError } from '@/services/api-error'

vi.mock('@/services/pathway.service')
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
const routerPushMock = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPushMock }) }))

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
      error: new ApiError('server exploded', 500, null),
    })

    const { save, feedback } = usePathwayBuilder()
    const result = await save()
    expect(result).toBeNull()
    expect(feedback.value?.color).toBe('error')
    expect(feedback.value?.message).toContain('server exploded')
    expect(feedback.value?.message).not.toContain('ApiError')
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

})
