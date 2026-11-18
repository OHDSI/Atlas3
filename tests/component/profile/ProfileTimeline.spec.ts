import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ProfileTimeline from '@/components/profile/ProfileTimeline.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

describe('ProfileTimeline', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders v-chart with one series per domain', () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 2,
      records: [
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
        { conceptId: 2, conceptName: 'B', domain: 'Condition', startDate: 1, endDate: null, startDay: 1, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': { template: '<div data-test="vchart" :data-options="JSON.stringify($attrs.option)" />' } } },
    })
    const opts = JSON.parse(w.find('[data-test="vchart"]').attributes('data-options') || '{}')
    expect(opts.series?.length).toBe(2)
  })

  it('emits brush with [from,to] day range', async () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: {
        plugins: [vuetify],
        stubs: { 'v-chart': { template: '<div />', methods: { dispatchAction: vi.fn() } } },
      },
    })
    ;(w.vm as { onBrush?: (e: unknown) => void }).onBrush?.({ areas: [{ coordRange: [-30, 60] }] })
    expect(store.dateRange).toEqual([-30, 60])
  })

  it('clears dateRange when brush returns no areas', async () => {
    const s = useProfileStore()
    s.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 0, records: [], cohorts: [], observationPeriods: [],
    } as never
    s.setDateRange([-10, 10])
    const w = mount(ProfileTimeline, { global: { plugins: [vuetify], stubs: { 'v-chart': true } } })
    ;(w.vm as { onBrush: (e: unknown) => void }).onBrush({ areas: [] })
    expect(s.dateRange).toBeNull()
  })

  it('renders era records as a custom range series and includes day 0 on the axis', () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 2,
      records: [
        { conceptId: 1, conceptName: 'Aspirin Era', domain: 'DrugEra', startDate: 1, endDate: 1, startDay: 10, endDay: 40 },
        { conceptId: 2, conceptName: 'Visit', domain: 'Visit', startDate: 1, endDate: null, startDay: 50, endDay: null },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': { template: '<div data-test="vchart" :data-options="JSON.stringify($attrs.option)" />' } } },
    })
    const opts = JSON.parse(w.find('[data-test="vchart"]').attributes('data-options') || '{}')
    expect(opts.xAxis.min).toBeLessThanOrEqual(0)
    expect(opts.xAxis.max).toBeGreaterThanOrEqual(40)
    const markLines = (opts.series as Array<{ markLine?: { data?: Array<{ xAxis: number }> } }>).flatMap(s => s.markLine?.data ?? [])
    expect(markLines.some(m => m.xAxis === 0)).toBe(true)
    for (const s of opts.series as Array<{ type: string }>) {
      expect(s.type).toBe('custom')
    }
  })

  it('passes startDay and endDay into the era series data', () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [
        { conceptId: 1, conceptName: 'Aspirin Era', domain: 'DrugEra', startDate: 1, endDate: 1, startDay: 10, endDay: 40 },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': { template: '<div data-test="vchart" :data-options="JSON.stringify($attrs.option)" />' } } },
    })
    const opts = JSON.parse(w.find('[data-test="vchart"]').attributes('data-options') || '{}')
    const eraSeries = (opts.series as Array<{ name: string; data: Array<{ value: number[] }> }>).find(s => s.name === 'DrugEra')!
    expect(eraSeries.data[0].value[0]).toBe(10)
    expect(eraSeries.data[0].value[1]).toBe(40)
    expect(eraSeries.data[0].value[2]).toBe('DrugEra')
  })

  it('escapes HTML in concept names rendered in the tooltip', () => {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: 1,
      records: [
        { conceptId: 1, conceptName: '<img src=x onerror=alert(1)>', domain: 'DrugEra', startDate: 1, endDate: 1, startDay: 0, endDay: 1 },
      ],
      cohorts: [], observationPeriods: [],
    } as never
    const w = mount(ProfileTimeline, {
      global: { plugins: [vuetify], stubs: { 'v-chart': true } },
    })
    // Access the live computed option via script-setup internals exposed by Vue Test Utils
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const option = (w.vm as any).$.setupState.option
    const out = option.tooltip.formatter({
      data: { name: '<img src=x onerror=alert(1)>', value: [0, 1, 'DrugEra'], isRange: true },
    })
    expect(out).not.toContain('<img')
    expect(out).toContain('&lt;img')
  })

  function personWithRecords(records: unknown[]) {
    const store = useProfileStore()
    store.person = {
      gender: 'M', yearOfBirth: 1980, monthOfBirth: null, dayOfBirth: null,
      ageAtIndex: 40, recordCount: records.length, records,
      cohorts: [], observationPeriods: [],
    } as never
    return store
  }

  function liveOption(w: ReturnType<typeof mount>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (w.vm as any).$.setupState.option
  }

  it('zooms the x-axis to the brushed range and clears the brush rectangle', () => {
    const store = personWithRecords([
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: -300, endDay: null },
      { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 1, endDate: null, startDay: 500, endDay: null },
    ])
    const dispatchAction = vi.fn()
    const w = mount(ProfileTimeline, {
      global: {
        plugins: [vuetify],
        stubs: { 'v-chart': { template: '<div />', methods: { dispatchAction } } },
      },
    })
    expect(liveOption(w).xAxis).toMatchObject({ min: -300, max: 500 })

    ;(w.vm as { onBrush: (e: unknown) => void }).onBrush({ areas: [{ coordRange: [-30.4, 59.2] }] })

    expect(store.dateRange).toEqual([-31, 60])
    expect(liveOption(w).xAxis).toMatchObject({ min: -31, max: 60 })
    expect(dispatchAction).toHaveBeenCalledWith({ type: 'brush', areas: [] })

    store.setDateRange(null)
    expect(liveOption(w).xAxis).toMatchObject({ min: -300, max: 500 })
  })

  it('lists only the domains the person has records in', () => {
    personWithRecords([
      { conceptId: 1, conceptName: 'A', domain: 'Condition', startDate: 1, endDate: null, startDay: 0, endDay: null },
      { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 1, endDate: null, startDay: 0, endDay: null },
    ])
    const w = mount(ProfileTimeline, { global: { plugins: [vuetify], stubs: { 'v-chart': true } } })
    expect(liveOption(w).yAxis.data).toEqual(['Drug', 'Condition'])
  })

  it('offsets each event vertically by its jitter, inside its domain row, and clips to the plot', () => {
    personWithRecords([
      { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: 5, endDay: null },
    ])
    const w = mount(ProfileTimeline, { global: { plugins: [vuetify], stubs: { 'v-chart': true } } })
    const series = liveOption(w).series[0]
    expect(series.clip).toBe(true)

    const rowHeight = 40
    const render = (jitter: number) =>
      series.renderItem(null, {
        value: (i: number) => [5, null, 'Drug', jitter][i],
        coord: () => [100, 200],
        size: () => [0, rowHeight],
        style: () => ({}),
      }).shape
    const spread = rowHeight * 0.8 - 8

    expect(render(0).y).toBe(200 - 4)
    expect(render(0.5).y).toBe(200 + spread / 2 - 4)
    expect(render(-0.5).y).toBe(200 - spread / 2 - 4)
  })
  describe('time range control', () => {
    function mountWithChart(dispatchAction = vi.fn()) {
      personWithRecords([
        { conceptId: 1, conceptName: 'A', domain: 'Drug', startDate: 1, endDate: null, startDay: -800, endDay: null },
        { conceptId: 2, conceptName: 'B', domain: 'Drug', startDate: 1, endDate: null, startDay: 900, endDay: null },
      ])
      return mount(ProfileTimeline, {
        global: {
          plugins: [vuetify],
          stubs: { 'v-chart': { template: '<div />', methods: { dispatchAction } } },
        },
      })
    }

    it('shows a labelled time range control with text presets instead of the chart toolbox icon', () => {
      const w = mountWithChart()
      const control = w.find('[data-test="profile-time-range"]')
      expect(control.text()).toContain('Time range')
      expect(w.find('[data-test="profile-time-range-all"]').text()).toBe('All time')
      expect(w.find('[data-test="profile-time-range-days30"]').text()).toBe('±30 days')
      expect(w.find('[data-test="profile-time-range-year1"]').text()).toBe('±1 year')
      expect(w.find('[data-test="profile-time-range-select"]').text()).toContain('Select on chart')
      expect(liveOption(w).toolbox).toEqual({ show: false })
      expect(liveOption(w).brush.toolbox).toEqual([])
    })

    it('applies presets around cohort entry and returns to all time', async () => {
      const w = mountWithChart()
      const store = useProfileStore()
      expect(w.find('[data-test="profile-time-range-all"]').classes()).toContain('v-btn--active')

      await w.find('[data-test="profile-time-range-year1"]').trigger('click')
      expect(store.dateRange).toEqual([-365, 365])
      expect(liveOption(w).xAxis).toMatchObject({ min: -365, max: 365 })
      expect(w.find('[data-test="profile-time-range-year1"]').classes()).toContain('v-btn--active')

      await w.find('[data-test="profile-time-range-days30"]').trigger('click')
      expect(store.dateRange).toEqual([-30, 30])

      await w.find('[data-test="profile-time-range-all"]').trigger('click')
      expect(store.dateRange).toBeNull()
      expect(liveOption(w).xAxis).toMatchObject({ min: -800, max: 900 })
    })

    it('highlights no preset for a custom brushed range', async () => {
      const w = mountWithChart()
      useProfileStore().setDateRange([-12, 40])
      await w.vm.$nextTick()
      for (const key of ['all', 'days30', 'year1']) {
        expect(w.find(`[data-test="profile-time-range-${key}"]`).classes()).not.toContain('v-btn--active')
      }
    })

    it('starts brush selection from the button and stops after a range is chosen', async () => {
      const dispatchAction = vi.fn()
      const w = mountWithChart(dispatchAction)
      expect(w.find('[data-test="profile-time-range-hint"]').exists()).toBe(false)

      await w.find('[data-test="profile-time-range-select"]').trigger('click')
      expect(dispatchAction).toHaveBeenCalledWith({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: { brushType: 'lineX', brushMode: 'single' },
      })
      expect(w.find('[data-test="profile-time-range-select"]').attributes('aria-pressed')).toBe('true')
      expect(w.find('[data-test="profile-time-range-hint"]').exists()).toBe(true)

      ;(w.vm as { onBrush: (e: unknown) => void }).onBrush({ areas: [{ coordRange: [-5, 20] }] })
      await w.vm.$nextTick()
      expect(useProfileStore().dateRange).toEqual([-5, 20])
      expect(dispatchAction).toHaveBeenLastCalledWith({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: { brushType: false },
      })
      expect(w.find('[data-test="profile-time-range-hint"]').exists()).toBe(false)
    })

    it('cancels brush selection when the button is clicked again', async () => {
      const dispatchAction = vi.fn()
      const w = mountWithChart(dispatchAction)
      const btn = w.find('[data-test="profile-time-range-select"]')
      await btn.trigger('click')
      await btn.trigger('click')
      expect(dispatchAction).toHaveBeenLastCalledWith({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: { brushType: false },
      })
      expect(btn.attributes('aria-pressed')).toBe('false')
    })
  })
})
