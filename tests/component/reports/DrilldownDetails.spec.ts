import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DrilldownDetails from '@/components/reports/DrilldownDetails.vue'
import type { DrilldownReport } from '@/models/report.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function fullData(): DrilldownReport {
  return {
    conceptId: 1,
    conceptName: 'Test',
    conceptPath: 'Root||Test',
    ageAtFirstOccurrence: [
      { category: 'M', min: 0, p10: 5, p25: 15, median: 35, p75: 55, p90: 70, max: 90 },
    ],
    lengthOfEra: [
      { category: 'M', min: 1, p10: 30, p25: 100, median: 365, p75: 730, p90: 1095, max: 3650 },
    ],
    prevalenceByMonth: [
      { date: '01/2020', value: 10 },
      { date: '02/2020', value: 15 },
    ],
    prevalenceByGenderAgeYear: {
      categories: ['M', 'F'],
      series: [
        { name: '0-10', category: 'M', data: [{ x: 2020, y: 5 }] },
      ],
    },
    byType: [{ name: 'T1', value: 100 }],
    byUnit: [{ name: 'mg/dL', value: 50 }],
    byValueAsConcept: [{ name: 'Positive', value: 25 }],
    byOperator: [{ name: '>', value: 10 }],
    byQualifier: [{ name: 'qual', value: 5 }],
    byFrequency: { categories: ['1'], values: [100] },
  }
}

/**
 * Render with all child chart components stubbed so we can inspect
 * the data they're passed without instantiating ECharts.
 */
function createWrapper(props: Partial<{
  data: DrilldownReport | null
  loading: boolean
  conceptName: string
  conceptPath: string
  domain: string
}> = {}) {
  return mount(DrilldownDetails, {
    props: {
      data: fullData(),
      conceptName: 'Test',
      conceptPath: 'Root||Test',
      ...props,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        TrellisChart: { name: 'TrellisChart', template: '<div class="trellis-stub" />', props: ['data', 'height'] },
        BoxPlotChart: { name: 'BoxPlotChart', template: '<div class="box-stub" />', props: ['data', 'height'] },
        AtlasLineChart: { name: 'AtlasLineChart', template: '<div class="line-stub" />', props: ['data', 'height', 'xAxisType'] },
        PieChart: { name: 'PieChart', template: '<div class="pie-stub" />', props: ['data', 'height'] },
        BarChart: { name: 'BarChart', template: '<div class="bar-stub" />', props: ['data', 'height'] },
      },
    },
  })
}

describe('DrilldownDetails', () => {
  describe('domain-driven section rendering', () => {
    it('renders all breakdown sections for measurement domain', () => {
      const w = createWrapper({ domain: 'measurement' })
      expect(w.find('[data-testid=drilldown-byType]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byUnit]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byValueAsConcept]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byOperator]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byFrequency]').exists()).toBe(true)
    })

    it('omits measurement-only breakdowns for observation domain', () => {
      const w = createWrapper({ domain: 'observation' })
      expect(w.find('[data-testid=drilldown-byUnit]').exists()).toBe(false)
      expect(w.find('[data-testid=drilldown-byOperator]').exists()).toBe(false)
      expect(w.find('[data-testid=drilldown-byQualifier]').exists()).toBe(true)
    })

    it('omits byFrequency for visit domain', () => {
      const w = createWrapper({ domain: 'visit' })
      expect(w.find('[data-testid=drilldown-byFrequency]').exists()).toBe(false)
      expect(w.find('[data-testid=drilldown-byType]').exists()).toBe(false)
    })

    it('defaults to condition domain when none provided', () => {
      const w = createWrapper()
      expect(w.find('[data-testid=drilldown-byType]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-prevalenceByMonth]').exists()).toBe(true)
      // byFrequency is not in condition domain
      expect(w.find('[data-testid=drilldown-byFrequency]').exists()).toBe(false)
    })

    it('renders condition-era lengthOfEra section', () => {
      const w = createWrapper({ domain: 'conditionEra' })
      expect(w.find('[data-testid=drilldown-lengthOfEra]').exists()).toBe(true)
    })

    it('renders procedure domain sections', () => {
      const w = createWrapper({ domain: 'procedure' })
      expect(w.find('[data-testid=drilldown-byType]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byFrequency]').exists()).toBe(true)
    })

    it('renders drug domain sections', () => {
      const w = createWrapper({ domain: 'drug' })
      expect(w.find('[data-testid=drilldown-byFrequency]').exists()).toBe(true)
      expect(w.find('[data-testid=drilldown-byType]').exists()).toBe(true)
    })

    it('renders TrellisChart when prevalenceByGenderAgeYear is present', () => {
      const w = createWrapper()
      const trellis = w.findComponent({ name: 'TrellisChart' })
      expect(trellis.exists()).toBe(true)
      expect(trellis.props('data')).toBeDefined()
    })

    it('renders AtlasLineChart when prevalenceByMonth is present', () => {
      const w = createWrapper()
      const line = w.findComponent({ name: 'AtlasLineChart' })
      expect(line.exists()).toBe(true)
    })

    it('renders BoxPlotChart when ageAtFirstOccurrence is present', () => {
      const w = createWrapper()
      const boxes = w.findAllComponents({ name: 'BoxPlotChart' })
      expect(boxes.length).toBeGreaterThan(0)
    })
  })

  describe('formatTimeSeriesData transformation', () => {
    it('converts TimeSeriesData[] into LineChartData with series and monthCodes passed to AtlasLineChart', () => {
      const w = createWrapper()
      const line = w.findComponent({ name: 'AtlasLineChart' })
      const data = line.props('data') as { monthCodes: (number | string)[]; series: Array<{ name: string; data: number[] }>; yAxisLabel: string }
      expect(data.series).toHaveLength(1)
      expect(data.series[0].name).toBe('Prevalence per 1000 people')
      expect(data.series[0].data).toEqual([10, 15])
      expect(data.monthCodes).toEqual([202001, 202002])
      expect(data.yAxisLabel).toBe('Prevalence per 1000 people')
    })
  })

  describe('loading state', () => {
    it('shows the overlay/progress when loading', () => {
      const w = createWrapper({ loading: true })
      // Overlay rendered, chart grid not
      expect(w.find('.drilldown-details__chart-grid').exists()).toBe(false)
    })

    it('hides the chart grid when data is null', () => {
      const w = createWrapper({ data: null })
      expect(w.find('.drilldown-details__chart-grid').exists()).toBe(false)
    })
  })

  describe('close emit', () => {
    it('emits close when the close button is clicked', async () => {
      const w = createWrapper()
      const btn = w.findComponent({ name: 'AtlasIconButton' })
      expect(btn.exists()).toBe(true)
      await btn.trigger('click')
      expect(w.emitted('close')).toBeTruthy()
    })
  })

  describe('hasAnyData (empty state)', () => {
    it('shows the info alert when no fields have data', () => {
      const w = createWrapper({
        data: {
          conceptId: 1,
          conceptName: 'X',
          conceptPath: 'p',
          // All optional fields omitted
        },
        domain: 'measurement',
      })
      expect(w.findComponent({ name: 'AtlasAlert' }).exists()).toBe(true)
    })

    it('considers all-empty arrays + empty-series TrellisChartData as no data', () => {
      const w = createWrapper({
        data: {
          conceptId: 1,
          conceptName: 'X',
          conceptPath: 'p',
          byType: [],
          byUnit: [],
          byValueAsConcept: [],
          byOperator: [],
          prevalenceByMonth: [],
          prevalenceByGenderAgeYear: { categories: [], series: [] },
          ageAtFirstOccurrence: [],
        },
        domain: 'measurement',
      })
      // byFrequency is omitted entirely → no truthy non-array/series field
      expect(w.findComponent({ name: 'AtlasAlert' }).exists()).toBe(true)
    })

    it('treats a present byFrequency object as "has data" (truthy fallback)', () => {
      const w = createWrapper({
        data: {
          conceptId: 1,
          conceptName: 'X',
          conceptPath: 'p',
          byFrequency: { categories: [], values: [] },
        },
        domain: 'measurement',
      })
      expect(w.findComponent({ name: 'AtlasAlert' }).exists()).toBe(false)
    })

    it('does NOT show the alert when at least one field has data', () => {
      const w = createWrapper({ domain: 'measurement' })
      expect(w.findComponent({ name: 'AtlasAlert' }).exists()).toBe(false)
    })

    it('considers TrellisChartData with non-empty series as "has data"', () => {
      const w = createWrapper({
        data: {
          conceptId: 1,
          conceptName: 'X',
          conceptPath: 'p',
          prevalenceByGenderAgeYear: {
            categories: ['M'],
            series: [{ name: 's', category: 'M', data: [{ x: 1, y: 2 }] }],
          },
        },
        domain: 'condition',
      })
      expect(w.findComponent({ name: 'AtlasAlert' }).exists()).toBe(false)
    })
  })

  describe('header content', () => {
    it('renders the concept name and path', () => {
      const w = createWrapper({ conceptName: 'Hypertension', conceptPath: 'Root||Hypertension' })
      expect(w.text()).toContain('Hypertension')
      expect(w.text()).toContain('Root||Hypertension')
    })
  })
})
