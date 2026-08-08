import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProfileStore } from '@/stores/profile'
import { useTimelineFilters, VUETIFY_COLOR_HEX } from '@/composables/useTimelineFilters'
import { DOMAIN_COLORS, DARK_DOMAIN_COLORS } from '@/utils/domain-colors'

const personWith = (records: unknown[], observationPeriods: unknown[] = []) =>
  ({
    gender: 'M',
    yearOfBirth: 1980,
    monthOfBirth: null,
    dayOfBirth: null,
    ageAtIndex: 40,
    recordCount: records.length,
    records,
    cohorts: [],
    observationPeriods,
  }) as never

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

describe('useTimelineFilters axis extent + isRange', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('marks era records with endDay > startDay as ranges', () => {
    const store = useProfileStore()
    store.person = personWith([
      { conceptId: 1, conceptName: 'A', domain: 'DrugEra', startDate: null, endDate: null, startDay: 5, endDay: 20 },
      { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: null, endDate: null, startDay: 7, endDay: null },
      { conceptId: 3, conceptName: 'C', domain: 'Condition', startDate: null, endDate: null, startDay: 3, endDay: 3 },
    ])
    const { chartSeries } = useTimelineFilters()
    const all = chartSeries.value.flatMap(d => d.points)
    const era = all.find(p => p.conceptId === 1)!
    const drug = all.find(p => p.conceptId === 2)!
    const same = all.find(p => p.conceptId === 3)!
    expect(era.isRange).toBe(true)
    expect(drug.isRange).toBe(false)
    expect(same.isRange).toBe(false)
  })

  it('axisExtent includes 0 even when all records are positive', () => {
    const store = useProfileStore()
    store.person = personWith([
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: null, endDate: null, startDay: 30, endDay: 60 },
    ])
    const { axisExtent } = useTimelineFilters()
    expect(axisExtent.value.min).toBeLessThanOrEqual(0)
    expect(axisExtent.value.max).toBeGreaterThanOrEqual(60)
  })

  it('axisExtent covers observation periods', () => {
    const store = useProfileStore()
    store.person = personWith(
      [{ conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: null, endDate: null, startDay: 0, endDay: 1 }],
      [{ startDate: null, endDate: null, startDays: -365, endDays: 730 }],
    )
    const { axisExtent } = useTimelineFilters()
    expect(axisExtent.value.min).toBeLessThanOrEqual(-365)
    expect(axisExtent.value.max).toBeGreaterThanOrEqual(730)
  })

  it('axisExtent is finite even with no records and no observation periods', () => {
    const store = useProfileStore()
    store.person = personWith([], [])
    const { axisExtent } = useTimelineFilters()
    expect(Number.isFinite(axisExtent.value.min)).toBe(true)
    expect(Number.isFinite(axisExtent.value.max)).toBe(true)
    expect(axisExtent.value.min).toBeLessThanOrEqual(0)
    expect(axisExtent.value.max).toBeGreaterThanOrEqual(0)
  })
})

// VUETIFY_COLOR_HEX is a hand-maintained hex table paralleling
// domain-colors.ts, needed because this composable paints an ECharts
// canvas outside Vuetify's theme pipeline. Without this check, a domain
// added (or renamed) in one module but not the other silently falls back
// to VUETIFY_COLOR_HEX.primary — the wrong colour, no test, no type error.
describe('VUETIFY_COLOR_HEX stays in sync with domain-colors', () => {
  const tokens = [...new Set([...Object.values(DOMAIN_COLORS), ...Object.values(DARK_DOMAIN_COLORS)])]

  it.each(tokens)('%s resolves to a real hex entry, not a silent fallback', (token) => {
    expect(VUETIFY_COLOR_HEX).toHaveProperty(token)
    expect(VUETIFY_COLOR_HEX[token]).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})
