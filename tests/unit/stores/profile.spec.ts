import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProfileStore } from '@/stores/profile'

vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn(),
  getCohortConceptSets: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('Profile Store — state and route params', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const s = useProfileStore()
    expect(s.person).toBeNull()
    expect(s.sourceKey).toBeNull()
    expect(s.personId).toBeNull()
    expect(s.cohortDefinitionId).toBeNull()
    expect(s.loading).toBe(false)
    expect(s.error).toBeNull()
    expect(s.domainFilter.size).toBe(0)
    expect(s.textFilter).toBe('')
    expect(s.dateRange).toBeNull()
    expect(s.highlights.size).toBe(0)
  })

  it('setRouteParams updates the route refs', () => {
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 7, cohortDefinitionId: 42 })
    expect(s.sourceKey).toBe('SYNPUF')
    expect(s.personId).toBe(7)
    expect(s.cohortDefinitionId).toBe(42)
  })

  it('reset clears person/filters/highlights but preserves sourceKey', () => {
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 7 })
    s.setDomainFilter('Drug', true)
    s.applyHighlight([1], '#a6cee3')
    s.reset()
    expect(s.sourceKey).toBe('SYNPUF')
    expect(s.personId).toBeNull()
    expect(s.domainFilter.size).toBe(0)
    expect(s.highlights.size).toBe(0)
  })
})
