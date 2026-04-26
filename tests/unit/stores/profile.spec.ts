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

  it('does not fetch concept sets when person load fails (even with cohortDefinitionId)', async () => {
    const { getPerson, getCohortConceptSets } = await import('@/services/profile.service')
    ;(getPerson as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: 'boom' })
    const s = useProfileStore()
    s.setRouteParams({ sourceKey: 'SYNPUF', personId: 99, cohortDefinitionId: 42 })
    await s.loadPerson()
    expect(getCohortConceptSets).not.toHaveBeenCalled()
    expect(s.cohortConceptSets).toEqual([])
  })
})

describe('Profile Store — getters', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  function seed(records: Array<Partial<{ conceptId: number; conceptName: string; domain: string; startDay: number; endDay: number | null }>>) {
    const s = useProfileStore()
    s.person = {
      gender: 'MALE', yearOfBirth: 1970, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 50, recordCount: records.length,
      records: records.map(r => ({
        conceptId: r.conceptId ?? 1, conceptName: r.conceptName ?? 'X',
        domain: r.domain ?? 'Drug',
        startDate: 1, endDate: null,
        startDay: r.startDay ?? 0, endDay: r.endDay ?? null,
      })),
      cohorts: [], observationPeriods: [
        { startDate: 1, endDate: 2, startDays: -100, endDays: 100 },
      ],
    } as never
    return s
  }

  it('domainCounts counts records per domain', () => {
    const s = seed([{ domain: 'Drug' }, { domain: 'Drug' }, { domain: 'Condition' }])
    expect(s.domainCounts).toEqual({ Drug: 2, Condition: 1 })
  })

  it('filteredRecords applies domainFilter when non-empty', () => {
    const s = seed([{ domain: 'Drug' }, { domain: 'Condition' }])
    s.setDomainFilter('Drug', true)
    expect(s.filteredRecords).toHaveLength(1)
    expect(s.filteredRecords[0]?.domain).toBe('Drug')
  })

  it('filteredRecords applies textFilter against conceptName (case-insensitive)', () => {
    const s = seed([
      { conceptId: 1, conceptName: 'Lisinopril' },
      { conceptId: 2, conceptName: 'Aspirin' },
    ])
    s.setTextFilter('LISI')
    expect(s.filteredRecords.map(r => r.conceptId)).toEqual([1])
  })

  it('filteredRecords applies dateRange against startDay', () => {
    const s = seed([
      { conceptId: 1, startDay: -100 },
      { conceptId: 2, startDay: 0 },
      { conceptId: 3, startDay: 200 },
    ])
    s.setDateRange([-50, 100])
    expect(s.filteredRecords.map(r => r.conceptId)).toEqual([2])
  })

  it('observationBands derives from observationPeriods', () => {
    const s = seed([])
    expect(s.observationBands).toEqual([{ x1: -100, x2: 100 }])
  })

  it('indexDate uses matching cohort.startDate when cohort context present', () => {
    const s = seed([{ startDay: 0 }])
    s.setRouteParams({ sourceKey: 'X', personId: 1, cohortDefinitionId: 42 })
    s.person = {
      ...s.person!,
      cohorts: [{ cohortDefinitionId: 42, startDate: 9999, endDate: null }],
      records: [{ conceptId: 1, conceptName: 'X', domain: 'Drug', startDate: 100, endDate: null, startDay: 0, endDay: null }],
    } as never
    expect(s.indexDate).toBe(9999)
  })

  it('indexDate falls back to min(record.startDate) when no cohort match', () => {
    const s = seed([])
    s.person = {
      ...s.person!,
      records: [
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 200, endDate: null, startDay: 0, endDay: null },
        { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 50,  endDate: null, startDay: 0, endDay: null },
        { conceptId: 3, conceptName: 'C', domain: 'Drug', startDate: 300, endDate: null, startDay: 0, endDay: null },
      ],
    } as never
    expect(s.indexDate).toBe(50)
  })

  it('indexDate is null when there are no records and no cohort match', () => {
    const s = seed([])
    s.person = { ...s.person!, records: [], cohorts: [] } as never
    expect(s.indexDate).toBeNull()
  })

  it('hasCohortContext reflects cohortDefinitionId', () => {
    const s = useProfileStore()
    expect(s.hasCohortContext).toBe(false)
    s.setRouteParams({ sourceKey: 'X', personId: 1, cohortDefinitionId: 42 })
    expect(s.hasCohortContext).toBe(true)
  })
})
