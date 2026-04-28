import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePathways } from '@/composables/usePathways'
import * as webapi from '@/services/webapi'

vi.mock('@/services/webapi')

const mkPathway = (id: number, name: string, tags: { id: number; name: string }[] = []) => ({
  id, name, tags,
  targetCohorts: [], eventCohorts: [],
  combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
})

describe('usePathways', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetchPathways populates and stops loading', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [mkPathway(1, 'A'), mkPathway(2, 'B')],
    })
    const { pathways, loading, fetchPathways } = usePathways()
    expect(loading.value).toBe(false)
    const p = fetchPathways()
    expect(loading.value).toBe(true)
    await p
    expect(loading.value).toBe(false)
    expect(pathways.value).toHaveLength(2)
  })

  it('filteredPathways applies search query', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [mkPathway(1, 'Diabetes Pathway'), mkPathway(2, 'Cardio Pathway')],
    })
    const { fetchPathways, filters, filteredPathways } = usePathways()
    await fetchPathways()
    filters.value.searchQuery = 'diab'
    expect(filteredPathways.value.map(p => p.id)).toEqual([1])
  })

  it('filteredPathways applies tag filter (all required)', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [
        mkPathway(1, 'A', [{ id: 1, name: 'foo' }]),
        mkPathway(2, 'B', [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]),
      ],
    })
    const { fetchPathways, filters, filteredPathways } = usePathways()
    await fetchPathways()
    filters.value.selectedTags = ['foo', 'bar']
    expect(filteredPathways.value.map(p => p.id)).toEqual([2])
  })

  it('paginatedPathways respects itemsPerPage and page', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: Array.from({ length: 25 }, (_, i) => mkPathway(i + 1, `P${i}`)),
    })
    const { fetchPathways, itemsPerPage, page, paginatedPathways } = usePathways()
    await fetchPathways()
    itemsPerPage.value = 10
    page.value = 1
    expect(paginatedPathways.value).toHaveLength(10)
    expect(paginatedPathways.value[0].id).toBe(11)
  })
})
