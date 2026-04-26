import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/services/webapi', () => ({
  listIncidenceRates: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))
import { useIncidenceRates } from '@/composables/useIncidenceRates'

beforeEach(() => vi.clearAllMocks())

describe('useIncidenceRates', () => {
  it('initial state', () => {
    const c = useIncidenceRates()
    expect(c.loading.value).toBe(false)
    expect(c.incidenceRates.value).toEqual([])
  })

  it('fetchIncidenceRates updates state', async () => {
    const c = useIncidenceRates()
    await c.fetchIncidenceRates()
    expect(c.loading.value).toBe(false)
    expect(c.error.value).toBeNull()
  })

  it('clearFilters resets', () => {
    const c = useIncidenceRates()
    c.filters.value.searchQuery = 'x'
    c.clearFilters()
    expect(c.filters.value.searchQuery).toBe('')
    expect(c.page.value).toBe(0)
  })
})
