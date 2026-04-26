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

describe('Profile Store — loadPerson', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  const profile = {
    gender: 'MALE', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 40, recordCount: 1,
    records: [{ conceptId: 1, conceptName: 'X', domain: 'Drug',
      startDate: 1, endDate: null, startDay: 0, endDay: null }],
    cohorts: [], observationPeriods: [],
  }

  it('does nothing when sourceKey or personId is missing', async () => {
    const { getPerson } = await import('@/services/profile.service')
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: null })
    await s.loadPerson()
    expect(getPerson).not.toHaveBeenCalled()
  })

  it('loads profile and stores it on success', async () => {
    const { getPerson } = await import('@/services/profile.service')
    ;(getPerson as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: profile })
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 7 })
    await s.loadPerson()
    expect(s.person).toEqual(profile)
    expect(s.error).toBeNull()
    expect(s.loading).toBe(false)
  })

  it('sets error and clears person on failure', async () => {
    const { getPerson } = await import('@/services/profile.service')
    ;(getPerson as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'boom', code: 'NOT_FOUND' })
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 99 })
    await s.loadPerson()
    expect(s.person).toBeNull()
    expect(s.error).toBe('boom')
  })

  it('also fetches concept sets when cohortDefinitionId is set', async () => {
    const { getPerson, getCohortConceptSets } = await import('@/services/profile.service')
    ;(getPerson as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: profile })
    ;(getCohortConceptSets as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true, data: [{ id: 0, name: 'A' }] })
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 7, cohortDefinitionId: 42 })
    await s.loadPerson()
    expect(getCohortConceptSets).toHaveBeenCalledWith(42)
    expect(s.cohortConceptSets).toEqual([{ id: 0, name: 'A' }])
  })
})
