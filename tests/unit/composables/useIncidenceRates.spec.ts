import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/services/webapi', () => ({
  listIncidenceRates: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
import { useIncidenceRates } from '@/composables/useIncidenceRates'
import { listIncidenceRates } from '@/services/webapi'
import type { Mock } from 'vitest'

beforeEach(() => vi.clearAllMocks())

const mkIR = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Sample IR',
  description: 'desc',
  tags: [],
  createdBy: { id: 1, name: 'alice' },
  createdDate: '2024-01-01T00:00:00Z',
  modifiedDate: '2024-06-01T00:00:00Z',
  ...overrides,
})

describe('useIncidenceRates', () => {
  it('initial state', () => {
    const c = useIncidenceRates()
    expect(c.loading.value).toBe(false)
    expect(c.incidenceRates.value).toEqual([])
  })

  it('fetchIncidenceRates updates state on success', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [mkIR({ id: 1, name: 'A' }), mkIR({ id: 2, name: 'B' })],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    expect(c.loading.value).toBe(false)
    expect(c.error.value).toBeNull()
    expect(c.incidenceRates.value).toHaveLength(2)
  })

  it('fetchIncidenceRates surfaces failure as Error when result.success=false', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: false,
      error: 'service down',
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    expect(c.error.value).toBeInstanceOf(Error)
    expect(c.error.value?.message).toBe('service down')
  })

  it('fetchIncidenceRates catches thrown errors', async () => {
    (listIncidenceRates as Mock).mockRejectedValueOnce(new Error('network'))
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    expect(c.error.value?.message).toBe('network')
    expect(c.loading.value).toBe(false)
  })

  it('fetchIncidenceRates wraps non-Error rejections', async () => {
    (listIncidenceRates as Mock).mockRejectedValueOnce('boom')
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    expect(c.error.value).toBeInstanceOf(Error)
    expect(c.error.value?.message).toBe('Failed to load')
  })

  it('clearFilters resets', () => {
    const c = useIncidenceRates()
    c.filters.value.searchQuery = 'x'
    c.clearFilters()
    expect(c.filters.value.searchQuery).toBe('')
    expect(c.page.value).toBe(0)
  })

  it('filteredIncidenceRates filters by search query (matches name)', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, name: 'Diabetes IR', description: null }),
        mkIR({ id: 2, name: 'Cardio IR', description: null }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.searchQuery = 'diab'
    expect(c.filteredIncidenceRates.value.map(ir => ir.id)).toEqual([1])
  })

  it('filteredIncidenceRates also searches description', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, name: 'IR-A', description: 'something hypertensive' }),
        mkIR({ id: 2, name: 'IR-B', description: 'something else' }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.searchQuery = 'hyper'
    expect(c.filteredIncidenceRates.value.map(ir => ir.id)).toEqual([1])
  })

  it('filteredIncidenceRates filters by tags (all required)', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, tags: [{ id: 1, name: 'foo' }] }),
        mkIR({ id: 2, tags: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }] }),
        mkIR({ id: 3, tags: undefined }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.selectedTags = ['foo', 'bar']
    expect(c.filteredIncidenceRates.value.map(ir => ir.id)).toEqual([2])
  })

  it('filteredIncidenceRates filters by author', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, createdBy: { id: 1, name: 'alice' } }),
        mkIR({ id: 2, createdBy: { id: 2, name: 'bob' } }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.author = 'alice'
    expect(c.filteredIncidenceRates.value.map(ir => ir.id)).toEqual([1])
  })

  it('filteredIncidenceRates filters by created/modified date range', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, createdDate: '2024-01-01T00:00:00Z', modifiedDate: '2024-02-01T00:00:00Z' }),
        mkIR({ id: 2, createdDate: '2024-06-01T00:00:00Z', modifiedDate: '2024-07-01T00:00:00Z' }),
        mkIR({ id: 3, createdDate: '2024-12-01T00:00:00Z', modifiedDate: '2025-01-01T00:00:00Z' }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.createdDateRange = {
      from: new Date('2024-03-01T00:00:00Z'),
      to: new Date('2024-09-01T00:00:00Z'),
    }
    c.filters.value.modifiedDateRange = {
      from: new Date('2024-01-01T00:00:00Z'),
      to: new Date('2024-12-31T00:00:00Z'),
    }
    expect(c.filteredIncidenceRates.value.map(ir => ir.id)).toEqual([2])
  })

  it('filteredIncidenceRates handles missing dates via nullish coalescing', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: [
        mkIR({ id: 1, createdDate: undefined, modifiedDate: undefined }),
      ],
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.filters.value.createdDateRange = {
      from: new Date('2020-01-01T00:00:00Z'),
      to: new Date('2099-01-01T00:00:00Z'),
    }
    c.filters.value.modifiedDateRange = {
      from: new Date('2020-01-01T00:00:00Z'),
      to: new Date('2099-01-01T00:00:00Z'),
    }
    // (new Date(0)) is 1970, before 2020-from → excluded
    expect(c.filteredIncidenceRates.value).toEqual([])
  })

  it('paginatedIncidenceRates respects page and itemsPerPage', async () => {
    (listIncidenceRates as Mock).mockResolvedValueOnce({
      success: true,
      data: Array.from({ length: 25 }, (_, i) => mkIR({ id: i + 1, name: `IR-${i + 1}` })),
    })
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    c.itemsPerPage.value = 10
    c.page.value = 1
    expect(c.paginatedIncidenceRates.value).toHaveLength(10)
    expect(c.paginatedIncidenceRates.value[0].id).toBe(11)
    expect(c.totalItems.value).toBe(25)
    expect(c.totalPages.value).toBe(3)
  })
})
