import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { useTimelineFilters } from '@/composables/useTimelineFilters'

vi.mock('@/services/profile.service', () => ({
  getPerson: vi.fn(), getCohortConceptSets: vi.fn(),
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function seed() {
  const s = useProfileStore()
  s.person = {
    gender: 'MALE', yearOfBirth: 1970, monthOfBirth: null, dayOfBirth: null,
    ageAtIndex: 50, recordCount: 3,
    records: [
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 1, endDay: null },
      { conceptId: 2, conceptName: 'B', domain: 'Condition', startDate: 1, endDate: null, startDay: 2, endDay: null },
    ],
    cohorts: [], observationPeriods: [],
  } as never
  return s
}

describe('useTimelineFilters', () => {
  beforeEach(() => { setActivePinia(createPinia()); vi.clearAllMocks() })

  it('uniqueConcepts deduplicates by conceptId with counts', () => {
    seed()
    const { uniqueConcepts } = useTimelineFilters()
    const list = uniqueConcepts.value.sort((a, b) => a.conceptId - b.conceptId)
    expect(list).toEqual([
      { conceptId: 1, conceptName: 'A', domain: 'Drug', count: 2 },
      { conceptId: 2, conceptName: 'B', domain: 'Condition', count: 1 },
    ])
  })

  it('chartSeries returns one dataset per domain present in filtered records', () => {
    const s = seed()
    s.setDomainFilter('Drug', true)
    const { chartSeries } = useTimelineFilters()
    expect(chartSeries.value.map(d => d.domain).sort()).toEqual(['Drug'])
    expect(chartSeries.value[0]?.points.length).toBe(2)
  })

  it('chartSeries point.color reflects highlight map', () => {
    const s = seed()
    s.applyHighlight([1], '#a6cee3')
    const { chartSeries } = useTimelineFilters()
    const drugDataset = chartSeries.value.find(d => d.domain === 'Drug')
    expect(drugDataset?.points[0]?.color).toBe('#a6cee3')
  })
})
