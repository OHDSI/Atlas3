import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/services/webapi')
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

let webapi: typeof import('@/services/webapi')
let usePathways: typeof import('@/composables/usePathways').usePathways

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  ;({ usePathways } = await import('@/composables/usePathways'))
})

const mkPathway = (
  id: number,
  name: string,
  tags: { id: number; name: string }[] = [],
  extras: Record<string, unknown> = {}
) => ({
  id,
  name,
  tags,
  targetCohorts: [],
  eventCohorts: [],
  combinationWindow: 30,
  minCellCount: 5,
  maxDepth: 5,
  allowRepeats: false,
  ...extras,
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
    const { fetchPathways, itemsPerPage, page, paginatedPathways, totalItems, totalPages } = usePathways()
    await fetchPathways()
    itemsPerPage.value = 10
    page.value = 1
    expect(paginatedPathways.value).toHaveLength(10)
    expect(paginatedPathways.value[0].id).toBe(11)
    expect(totalItems.value).toBe(25)
    expect(totalPages.value).toBe(3)
  })

  it('fetchPathways surfaces failure as Error when result.success=false', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: false,
      error: 'service down',
    })
    const { fetchPathways, error } = usePathways()
    await fetchPathways()
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('service down')
  })

  it('fetchPathways catches thrown Error', async () => {
    vi.mocked(webapi.listPathways).mockRejectedValue(new Error('boom'))
    const { fetchPathways, error, loading } = usePathways()
    await fetchPathways()
    expect(error.value?.message).toBe('boom')
    expect(loading.value).toBe(false)
  })

  it('fetchPathways wraps non-Error rejections', async () => {
    vi.mocked(webapi.listPathways).mockRejectedValue('boom')
    const { fetchPathways, error } = usePathways()
    await fetchPathways()
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value?.message).toBe('Failed to load')
  })

  it('clearFilters resets filters and page', () => {
    const { filters, page, clearFilters } = usePathways()
    filters.value.searchQuery = 'foo'
    filters.value.selectedTags = ['t']
    filters.value.author = 'a'
    filters.value.createdDateRange = { from: new Date() }
    page.value = 3

    clearFilters()

    expect(filters.value.searchQuery).toBe('')
    expect(filters.value.selectedTags).toEqual([])
    expect(filters.value.author).toBe('')
    expect(filters.value.createdDateRange).toEqual({})
    expect(filters.value.modifiedDateRange).toEqual({})
    expect(page.value).toBe(0)
  })

  it('filteredPathways treats missing description as non-match (optional-chain branch)', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [
        mkPathway(1, 'P1', [], { description: undefined }),
        mkPathway(2, 'P2', [], { description: 'has-foo' }),
      ],
    })
    const { fetchPathways, filters, filteredPathways } = usePathways()
    await fetchPathways()
    filters.value.searchQuery = 'foo'
    expect(filteredPathways.value.map(p => p.id)).toEqual([2])
  })

  it('filteredPathways handles missing createdDate/modifiedDate via nullish coalescing', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [
        mkPathway(1, 'P1', [], { createdDate: undefined, modifiedDate: undefined }),
      ],
    })
    const { fetchPathways, filters, filteredPathways } = usePathways()
    await fetchPathways()
    filters.value.createdDateRange = {
      from: new Date('2020-01-01T00:00:00Z'),
      to: new Date('2099-01-01T00:00:00Z'),
    }
    filters.value.modifiedDateRange = {
      from: new Date('2020-01-01T00:00:00Z'),
      to: new Date('2099-01-01T00:00:00Z'),
    }
    // (new Date(0)) is 1970, which is before 2020-from → excluded
    expect(filteredPathways.value).toEqual([])
  })

  it('filteredPathways matches description and applies author/date filters', async () => {
    vi.mocked(webapi.listPathways).mockResolvedValue({
      success: true,
      data: [
        mkPathway(1, 'P1', [], {
          description: 'A clinical pathway for hypertension',
          createdBy: { id: 1, name: 'alice' },
          createdDate: '2024-01-01T00:00:00Z',
          modifiedDate: '2024-06-01T00:00:00Z',
        }),
        mkPathway(2, 'P2', [], {
          description: null,
          createdBy: { id: 2, name: 'bob' },
          createdDate: '2024-06-15T00:00:00Z',
          modifiedDate: '2024-07-01T00:00:00Z',
        }),
        mkPathway(3, 'P3', [], {
          description: null,
          createdBy: { id: 3, name: 'carol' },
          createdDate: '2024-11-01T00:00:00Z',
          modifiedDate: '2025-01-01T00:00:00Z',
        }),
      ],
    })
    const { fetchPathways, filters, filteredPathways } = usePathways()
    await fetchPathways()

    filters.value.searchQuery = 'hypertension'
    expect(filteredPathways.value.map(p => p.id)).toEqual([1])

    filters.value.searchQuery = ''
    filters.value.author = 'bob'
    expect(filteredPathways.value.map(p => p.id)).toEqual([2])

    filters.value.author = ''
    filters.value.createdDateRange = {
      from: new Date('2024-05-01T00:00:00Z'),
      to: new Date('2024-09-01T00:00:00Z'),
    }
    filters.value.modifiedDateRange = {
      from: new Date('2024-01-01T00:00:00Z'),
      to: new Date('2024-12-31T00:00:00Z'),
    }
    expect(filteredPathways.value.map(p => p.id)).toEqual([2])
  })
})
