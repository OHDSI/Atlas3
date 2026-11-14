import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/reusable.service', () => ({
  getReusable: vi.fn(),
  createReusable: vi.fn(),
  updateReusable: vi.fn(),
  copyReusable: vi.fn(),
  deleteReusable: vi.fn(),
  assignReusableTag: vi.fn(),
  unassignReusableTag: vi.fn(),
}))
vi.mock('@/services/reusable-versions.service', () => ({
  getReusableVersion: vi.fn(),
}))

import * as service from '@/services/reusable.service'
import { getReusableVersion } from '@/services/reusable-versions.service'
import { success, failure } from '@/types/api'
import { ApiError } from '@/services/api-error'
import { useReusableStore } from '@/stores/reusable'
import { serializeReusableDesign, createEmptyDesign } from '@/components/reusables/reusable-design'

const saved = {
  id: 4,
  name: 'Logic',
  description: null,
  data: serializeReusableDesign(createEmptyDesign('INITIAL_EVENT')),
  tags: [{ id: 1, name: 'Old', groups: [{ id: 9, name: 'Group' }] }],
}

describe('reusable store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('starts a new reusable dirty, with an empty design of the chosen type', () => {
    const store = useReusableStore()

    store.createNew('New Reusable', 'INITIAL_EVENT')

    expect(store.current).toEqual({ name: 'New Reusable', description: '' })
    expect(store.design.type).toBe('INITIAL_EVENT')
    expect(store.isDirty).toBe(true)
  })

  it('loads a reusable clean and tracks edits to its name and design', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(success(saved))
    const store = useReusableStore()

    expect(await store.load(4)).toBe(true)
    expect(store.design.type).toBe('INITIAL_EVENT')
    expect(store.isDirty).toBe(false)

    store.design.parameters.push({ id: 1, name: 'P', type: 'Concept Set', data: { id: -1 } })
    expect(store.isDirty).toBe(true)
  })

  it('records a load failure', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(failure(new ApiError('HTTP 404', 404, null)))
    const store = useReusableStore()

    expect(await store.load(4)).toBe(false)
    expect(store.error).toBe('HTTP 404')
  })

  it('creates a new reusable with its serialized design, then is clean', async () => {
    vi.mocked(service.createReusable).mockResolvedValue(success({ ...saved, id: 10 }))
    const store = useReusableStore()
    store.createNew('Logic', 'INITIAL_EVENT')

    const result = await store.save()

    expect(result?.id).toBe(10)
    expect(service.createReusable).toHaveBeenCalledWith({
      name: 'Logic',
      description: '',
      data: serializeReusableDesign(createEmptyDesign('INITIAL_EVENT')),
    })
    expect(store.isDirty).toBe(false)
  })

  it('updates an existing reusable and keeps it dirty when saving fails', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(success(saved))
    vi.mocked(service.updateReusable).mockResolvedValue(failure(new ApiError('HTTP 403', 403, null)))
    const store = useReusableStore()
    await store.load(4)
    store.current!.name = 'Renamed'

    expect(await store.save()).toBeNull()

    expect(service.updateReusable).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Renamed' }))
    expect(store.error).toBe('HTTP 403')
    expect(store.isDirty).toBe(true)
  })

  it('previews a version with the live tags, and saves it as current', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(success(saved))
    vi.mocked(getReusableVersion).mockResolvedValue({
      versionDTO: { version: 2, assetId: 4, createdDate: 1, archived: false },
      entityDTO: { name: 'Logic v2', data: serializeReusableDesign(createEmptyDesign('CRITERIA_GROUP')) },
    })
    vi.mocked(service.updateReusable).mockResolvedValue(success({ ...saved, name: 'Logic v2' }))
    const store = useReusableStore()
    await store.load(4)

    expect(await store.loadVersionPreview(4, 2)).toBe(true)
    expect(store.isPreviewMode).toBe(true)
    expect(store.current).toMatchObject({ id: 4, name: 'Logic v2', tags: saved.tags })
    expect(store.design.type).toBe('CRITERIA_GROUP')

    expect(await store.savePreviewAsCurrent()).toBe(true)
    expect(service.updateReusable).toHaveBeenCalledWith(4, expect.objectContaining({ name: 'Logic v2' }))
    expect(store.isPreviewMode).toBe(false)
  })

  it('refuses to save a preview when nothing is previewed', async () => {
    const store = useReusableStore()
    expect(await store.savePreviewAsCurrent()).toBe(false)
    expect(service.updateReusable).not.toHaveBeenCalled()
  })

  it('syncs tags through the reusable tag endpoints', async () => {
    vi.mocked(service.getReusable).mockResolvedValue(success(saved))
    vi.mocked(service.assignReusableTag).mockResolvedValue(success(undefined))
    vi.mocked(service.unassignReusableTag).mockResolvedValue(success(undefined))
    const store = useReusableStore()
    await store.load(4)

    const next = { id: 2, name: 'New', groups: [{ id: 9, name: 'Group' }] }
    expect(await store.syncTags([next])).toBe(true)

    expect(service.unassignReusableTag).toHaveBeenCalledWith(4, 1)
    expect(service.assignReusableTag).toHaveBeenCalledWith(4, 2)
    expect(store.current?.tags?.map(tag => tag.name)).toEqual(['Group', 'New'])
  })
})
