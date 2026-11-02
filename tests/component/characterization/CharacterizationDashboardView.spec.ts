import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationDashboardView from '@/components/characterization/CharacterizationDashboardView.vue'
import type {
  DistributionStat,
  LinkedCohort,
  PrevalenceStat,
} from '@/models/characterization.types'

vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    props: ['option', 'autoresize'],
    template: '<div class="v-chart" />',
  },
}))

vi.mock('@/components/ui/charts/AtlasBoxPlotChart.vue', () => ({
  default: {
    name: 'AtlasBoxPlotChart',
    props: ['data', 'height', 'showExport'],
    template: '<div class="box-plot" />',
  },
}))

const vuetify = createVuetify({ components, directives })

const TWO: LinkedCohort[] = [
  { id: 1, name: 'Target' },
  { id: 2, name: 'Comparator' },
]
const ONE: LinkedCohort[] = [{ id: 1, name: 'Target' }]
const SIX: LinkedCohort[] = [1, 2, 3, 4, 5, 6].map(id => ({ id, name: `C${id}` }))
const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#4e79a7']

type Strata = Record<string, Record<string, number>>

function prev(
  covariateName: string,
  pct: Strata,
  over: Partial<PrevalenceStat> = {}
): PrevalenceStat {
  return {
    analysisId: 1,
    analysisName: 'Conditions',
    covariateId: 1,
    covariateName,
    conceptId: 0,
    cohorts: TWO,
    strataNames: {},
    count: {},
    pct,
    ...over,
  }
}

function dist(covariateName: string, over: Partial<DistributionStat> = {}): DistributionStat {
  return {
    analysisId: 2,
    analysisName: 'Measurements',
    covariateId: 2,
    covariateName,
    conceptId: 0,
    cohorts: TWO,
    strataNames: {},
    avg: {},
    stdDev: {},
    min: {},
    p10: {},
    p25: {},
    median: {},
    p75: {},
    p90: {},
    max: {},
    ...over,
  }
}

const overall = (values: Record<string, number>): Strata => ({ overall: values })

function mountView(props: {
  prevalence?: PrevalenceStat[]
  distribution?: DistributionStat[]
  cohorts?: LinkedCohort[]
}) {
  return mount(CharacterizationDashboardView, {
    props: {
      prevalence: props.prevalence ?? [],
      distribution: props.distribution ?? [],
      cohorts: props.cohorts ?? TWO,
    },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasCard: { template: '<div class="stub-card"><slot /></div>' },
      },
    },
  })
}

function headings(w: VueWrapper) {
  return w.findAll('h3').map(h => h.text())
}

function cardTitles(w: VueWrapper) {
  return w.findAll('.char-dashboard__chart-title').map(t => t.text())
}

function charts(w: VueWrapper) {
  return w.findAllComponents({ name: 'VChart' })
}

function chartInCard(w: VueWrapper, title: string) {
  const match = charts(w).filter(
    c =>
      c.element.closest('.stub-card')?.querySelector('.char-dashboard__chart-title')?.textContent?.trim() ===
      title
  )
  expect(match).toHaveLength(1)
  return match[0]!
}

function onlyChart(w: VueWrapper) {
  const all = charts(w)
  expect(all).toHaveLength(1)
  return all[0]!
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Option = any

function optionOf(c: ReturnType<typeof onlyChart>): Option {
  return c.props('option')
}

function heightOf(c: ReturnType<typeof onlyChart>) {
  return (c.element as HTMLElement).style.height
}

const barTooltip = { trigger: 'axis', axisPointer: { type: 'shadow' } }
const legend = { top: 0, type: 'scroll' }
const pctAxis = { type: 'value', axisLabel: { formatter: '{value}%' } }

describe('CharacterizationDashboardView', () => {
  beforeEach(() => setActivePinia(createPinia()))

  describe('empty state', () => {
    it('shows only the no-data message when there is nothing to plot', () => {
      const w = mountView({})

      expect(headings(w)).toEqual([])
      expect(w.get('.char-dashboard__empty').text()).toBe('No data available for visualization.')
    })

    it('shows the no-data message for single-cohort rows that have no positive prevalence', () => {
      const w = mountView({
        cohorts: ONE,
        prevalence: [prev('Zero', overall({ '1': 0 })), prev('Missing', {})],
      })

      expect(headings(w)).toEqual([])
      expect(w.find('.char-dashboard__empty').exists()).toBe(true)
    })

    it('shows the no-data message when there are no cohorts at all', () => {
      const w = mountView({ cohorts: [], prevalence: [prev('X', overall({ '1': 10 }))] })

      expect(headings(w)).toEqual([])
      expect(w.find('.char-dashboard__empty').exists()).toBe(true)
    })
  })

  describe('distribution box plots', () => {
    it('builds one box per cohort that has a median, from the overall stratum', () => {
      const w = mountView({
        distribution: [
          dist('Weight', {
            min: { s1: { '1': -1 }, overall: { '1': 40, '2': 45 } },
            p10: overall({ '1': 50, '2': 55 }),
            p25: overall({ '1': 60, '2': 65 }),
            median: { s1: { '1': -1, '2': -1 }, overall: { '1': 70 } },
            p75: overall({ '1': 80, '2': 85 }),
            p90: overall({ '1': 90, '2': 95 }),
            max: overall({ '1': 100, '2': 105 }),
          }),
        ],
      })

      expect(headings(w)).toEqual(['Distributions'])
      expect(cardTitles(w)).toEqual(['Weight'])
      expect(w.getComponent({ name: 'AtlasBoxPlotChart' }).props('data')).toEqual([
        { category: 'Target', min: 40, p10: 50, p25: 60, median: 70, p75: 80, p90: 90, max: 100 },
      ])
      expect(w.find('.char-dashboard__empty').exists()).toBe(false)
    })

    it('uses the first stratum when there is no overall stratum and zero-fills missing stats', () => {
      const w = mountView({
        distribution: [
          dist('Age', {
            median: { male: { '1': 30, '2': 0 }, female: { '1': 99 } },
            p25: { male: { '2': 12 } },
          }),
        ],
      })

      expect(w.getComponent({ name: 'AtlasBoxPlotChart' }).props('data')).toEqual([
        { category: 'Target', min: 0, p10: 0, p25: 0, median: 30, p75: 0, p90: 0, max: 0 },
        { category: 'Comparator', min: 0, p10: 0, p25: 12, median: 0, p75: 0, p90: 0, max: 0 },
      ])
    })

    it('drops distributions with no median for any cohort', () => {
      const w = mountView({
        distribution: [
          dist('NoMedian', { min: overall({ '1': 1 }) }),
          dist('OtherCohort', { median: overall({ '9': 5 }) }),
          dist('Kept', { median: overall({ '2': 5 }) }),
        ],
      })

      expect(cardTitles(w)).toEqual(['Kept'])
      expect(w.findAllComponents({ name: 'AtlasBoxPlotChart' })).toHaveLength(1)
    })
  })

  describe('demographic profile', () => {
    it('charts gender rows per cohort and skips rows without percentages', () => {
      const w = mountView({
        prevalence: [
          prev('MALE', overall({ '1': 40, '2': 55 }), { analysisName: 'Demographics Gender' }),
          prev('FEMALE', overall({ '1': 60 }), { analysisName: 'Demographics Gender' }),
          prev('UNKNOWN', {}, { analysisName: 'Demographics Gender' }),
        ],
      })

      expect(headings(w)).toContain('Demographic Profile')
      expect(optionOf(chartInCard(w, 'Gender'))).toEqual({
        tooltip: barTooltip,
        legend,
        grid: { top: 35, right: 10, bottom: 30, left: 120 },
        xAxis: pctAxis,
        yAxis: {
          type: 'category',
          data: ['MALE', 'FEMALE'],
          axisLabel: { fontSize: 10, width: 100, overflow: 'truncate' },
        },
        series: [
          { name: 'Target', type: 'bar', data: [40, 60], itemStyle: { color: '#4e79a7' }, barMaxWidth: 20 },
          { name: 'Comparator', type: 'bar', data: [55, 0], itemStyle: { color: '#f28e2b' }, barMaxWidth: 20 },
        ],
      })
    })

    it('hides the gender chart when no gender row has percentages', () => {
      const w = mountView({
        cohorts: ONE,
        prevalence: [prev('MALE', {}, { analysisName: 'Gender' })],
      })

      expect(headings(w)).not.toContain('Demographic Profile')
      expect(cardTitles(w)).not.toContain('Gender')
    })

    it('cycles the five cohort colours for demographic bars', () => {
      const w = mountView({
        cohorts: SIX,
        prevalence: [prev('MALE', overall({ '1': 1, '6': 6 }), { analysisName: 'Gender' })],
      })

      const series = optionOf(chartInCard(w, 'Gender')).series as Option[]
      expect(series.map(s => s.itemStyle.color)).toEqual(PALETTE)
      expect(series.map(s => s.data)).toEqual([[1], [0], [0], [0], [0], [6]])
    })

    it('sorts age groups numerically with non-numeric groups first', () => {
      const ageRow = (name: string, pct: Strata) =>
        prev(name, pct, { analysisName: 'Demographics Age Group' })
      const w = mountView({
        prevalence: [
          ageRow('90+', overall({ '1': 1, '2': 2 })),
          ageRow('10-14', overall({ '1': 3 })),
          ageRow('unknown', overall({ '2': 4 })),
          ageRow('5-9', {}),
        ],
      })

      const chart = chartInCard(w, 'Age Distribution')
      expect(optionOf(chart)).toEqual({
        tooltip: barTooltip,
        legend,
        grid: { top: 35, right: 20, bottom: 30, left: 100 },
        xAxis: pctAxis,
        yAxis: {
          type: 'category',
          data: ['unknown', '5-9', '10-14', '90+'],
          axisLabel: { fontSize: 11 },
        },
        series: [
          { name: 'Target', type: 'bar', data: [0, 0, 3, 1], itemStyle: { color: '#4e79a7' }, barMaxWidth: 16 },
          { name: 'Comparator', type: 'bar', data: [4, 0, 0, 2], itemStyle: { color: '#f28e2b' }, barMaxWidth: 16 },
        ],
      })
      expect(heightOf(chart)).toBe('250px')
    })

    it('grows the age chart with the number of groups and cycles cohort colours', () => {
      const rows = Array.from({ length: 10 }, (_, i) =>
        prev(`${i * 5}-${i * 5 + 4}`, overall({ '1': i }), { analysisName: 'Age group' })
      )
      const w = mountView({ cohorts: SIX, prevalence: rows })

      const chart = chartInCard(w, 'Age Distribution')
      expect(heightOf(chart)).toBe('340px')
      expect((optionOf(chart).series as Option[]).map(s => s.itemStyle.color)).toEqual(PALETTE)
    })

    it('groups race and ethnicity rows into one chart per analysis', () => {
      const w = mountView({
        prevalence: [
          prev('White', overall({ '1': 70, '2': 65 }), { analysisName: 'Demographics Race' }),
          prev('Hispanic', overall({ '2': 12 }), { analysisName: 'Demographics Ethnicity' }),
          prev('Black', overall({ '1': 20 }), { analysisName: 'Demographics Race' }),
          prev('Unknown', {}, { analysisName: 'Demographics Race' }),
          prev('Diabetes', overall({ '1': 5, '2': 6 })),
        ],
      })

      expect(cardTitles(w)).toEqual([
        'Demographics Race',
        'Demographics Ethnicity',
        'Target vs Comparator',
      ])
      const race = optionOf(chartInCard(w, 'Demographics Race'))
      expect(race.yAxis.data).toEqual(['White', 'Black'])
      expect(race.series.map((s: Option) => s.data)).toEqual([[70, 20], [65, 0]])
      const eth = optionOf(chartInCard(w, 'Demographics Ethnicity'))
      expect(eth.yAxis.data).toEqual(['Hispanic'])
      expect(eth.series.map((s: Option) => s.data)).toEqual([[0], [12]])
    })

    it('omits a race analysis whose rows all lack percentages', () => {
      const w = mountView({
        cohorts: ONE,
        prevalence: [prev('White', {}, { analysisName: 'Race' })],
      })

      expect(headings(w)).not.toContain('Demographic Profile')
    })
  })

  describe('two-cohort prevalence comparison', () => {
    const domains = [
      ['CONDITION', '#4e79a7'],
      ['DRUG', '#f28e2b'],
      ['PROCEDURE', '#e15759'],
      ['MEASUREMENT', '#76b7b2'],
      ['OBSERVATION', '#59a14f'],
      ['DEMOGRAPHICS', '#9c755f'],
      ['DEVICE', '#edc948'],
      ['VISIT', '#b07aa1'],
    ] as const

    it('plots covariates present in both cohorts, one series per domain, plus a diagonal', () => {
      const w = mountView({
        prevalence: [
          ...domains.map(([d], i) => prev(`${d}-cov`, overall({ '1': i, '2': i + 1 }), { domainId: d })),
          prev('NoDomain', overall({ '1': 35, '2': 3 })),
          prev('OnlyFirst', overall({ '1': 50 }), { domainId: 'DRUG' }),
          prev('NoPct', {}, { domainId: 'DRUG' }),
        ],
      })

      expect(headings(w)).toEqual(['Prevalence Comparison'])
      const option = optionOf(chartInCard(w, 'Target vs Comparator'))
      expect(option.tooltip).toEqual({ trigger: 'item', formatter: expect.any(Function) })
      expect(option.legend).toEqual(legend)
      expect(option.grid).toEqual({ top: 40, right: 20, bottom: 50, left: 60 })
      expect(option.xAxis).toEqual({
        name: 'Target',
        nameLocation: 'center',
        nameGap: 35,
        type: 'value',
        min: 0,
        max: 39,
        axisLabel: { formatter: '{value}%' },
      })
      expect(option.yAxis).toEqual({
        name: 'Comparator',
        nameLocation: 'center',
        nameGap: 45,
        type: 'value',
        min: 0,
        max: 39,
        axisLabel: { formatter: '{value}%' },
      })
      expect(option.series).toEqual([
        ...domains.map(([d, color], i) => ({
          name: d,
          type: 'scatter',
          data: [[i, i + 1, `${d}-cov`]],
          symbolSize: 6,
          itemStyle: { color, opacity: 0.8 },
        })),
        {
          name: 'Other',
          type: 'scatter',
          data: [[35, 3, 'NoDomain']],
          symbolSize: 6,
          itemStyle: { color: '#999', opacity: 0.8 },
        },
        {
          type: 'line',
          data: [[0, 0], [39, 39]],
          lineStyle: { type: 'dashed', color: '#ccc', width: 1 },
          symbol: 'none',
          silent: true,
        },
      ])
    })

    it('groups several covariates of one domain into a single series', () => {
      const w = mountView({
        prevalence: [
          prev('A', overall({ '1': 1, '2': 2 }), { domainId: 'DRUG' }),
          prev('B', overall({ '1': 3, '2': 4 }), { domainId: 'CONDITION' }),
          prev('C', overall({ '1': 5, '2': 6 }), { domainId: 'DRUG' }),
        ],
      })

      const series = optionOf(chartInCard(w, 'Target vs Comparator')).series as Option[]
      expect(series.map(s => [s.name, s.data])).toEqual([
        ['DRUG', [[1, 2, 'A'], [5, 6, 'C']]],
        ['CONDITION', [[3, 4, 'B']]],
        [undefined, [[0, 0], [7, 7]]],
      ])
    })

    it('keeps the axes at least 2% wide for tiny prevalences', () => {
      const w = mountView({ prevalence: [prev('Rare', overall({ '1': 0.2, '2': 0.5 }))] })

      const option = optionOf(chartInCard(w, 'Target vs Comparator'))
      expect(option.xAxis.max).toBe(2)
      expect(option.yAxis.max).toBe(2)
    })

    it('formats the tooltip with both cohort percentages', () => {
      const w = mountView({ prevalence: [prev('X', overall({ '1': 1, '2': 2 }))] })

      const formatter = optionOf(chartInCard(w, 'Target vs Comparator')).tooltip.formatter
      expect(formatter({ data: [12.345, 6.7, 'Hypertension'] })).toBe(
        '<strong>Hypertension</strong><br/>Target: 12.35%<br/>Comparator: 6.70%'
      )
    })

    it('falls back to indexed axis names for unnamed cohorts', () => {
      const unnamed = [{ id: 1 }, { id: 2 }] as unknown as LinkedCohort[]
      const w = mountView({ cohorts: unnamed, prevalence: [prev('X', overall({ '1': 1, '2': 2 }))] })

      const option = optionOf(onlyChart(w))
      expect(option.xAxis.name).toBe('Cohort 1')
      expect(option.yAxis.name).toBe('Cohort 2')
    })

    it('does not compare or rank covariates for three cohorts beyond the first cohort top list', () => {
      const three = [...TWO, { id: 3, name: 'Third' }]
      const w = mountView({
        cohorts: three,
        prevalence: [prev('X', overall({ '1': 10, '2': 20, '3': 30 }), { stdDiff: 0.5 })],
      })

      expect(headings(w)).toEqual(['Top Covariates by Prevalence'])
      expect(optionOf(onlyChart(w)).series[0].data).toEqual([10])
    })
  })

  describe('covariate balance', () => {
    it('ranks covariates by absolute SMD and colours only imbalanced ones', () => {
      const w = mountView({
        prevalence: [
          prev('Balanced', {}, { stdDiff: 0.05, domainId: 'DRUG' }),
          prev('Strong', {}, { stdDiff: -0.3, domainId: 'CONDITION' }),
          prev('Edge', {}, { stdDiff: 0.1, domainId: 'UNKNOWN_DOMAIN' }),
          prev('NoDomain', {}, { stdDiff: 0.2 }),
          prev('NoSmd', {}),
        ],
      })

      expect(headings(w)).toEqual(['Covariate Balance (Std. Mean Difference)'])
      expect(w.get('.char-dashboard__chart-subtitle').text()).toContain('|SMD| > 0.1')
      const chart = onlyChart(w)
      const option = optionOf(chart)
      expect(option.tooltip).toEqual({ trigger: 'item', formatter: expect.any(Function) })
      expect(option.grid).toEqual({ top: 20, right: 40, bottom: 40, left: 200 })
      expect(option.xAxis).toEqual({
        type: 'value',
        name: 'Standardised Mean Difference',
        nameLocation: 'center',
        nameGap: 25,
      })
      expect(option.yAxis).toEqual({
        type: 'category',
        data: ['Balanced', 'Edge', 'NoDomain', 'Strong'],
        axisLabel: { fontSize: 10, width: 180, overflow: 'truncate' },
      })
      expect(option.series).toEqual([
        {
          type: 'scatter',
          data: [
            { value: [0.05, 0], itemStyle: { color: '#ccc' } },
            { value: [0.1, 1], itemStyle: { color: '#e15759' } },
            { value: [0.2, 2], itemStyle: { color: '#e15759' } },
            { value: [-0.3, 3], itemStyle: { color: '#4e79a7' } },
          ],
          symbolSize: 8,
        },
        {
          type: 'line',
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: '#999' },
            data: [{ xAxis: 0 }, { xAxis: 0.1 }, { xAxis: -0.1 }],
            label: { show: false },
          },
          data: [],
        },
      ])
      expect(heightOf(chart)).toBe('300px')
    })

    it('formats the SMD tooltip from the plotted row', () => {
      const w = mountView({
        prevalence: [
          prev('Strong', {}, { stdDiff: -0.3, domainId: 'CONDITION' }),
          prev('NoDomain', {}, { stdDiff: 0.2 }),
        ],
      })

      const formatter = optionOf(onlyChart(w)).tooltip.formatter
      expect(formatter({ name: '', data: { value: [-0.3, 1] } })).toBe(
        '<strong>Strong</strong><br/>Domain: CONDITION<br/>SMD: -0.3000'
      )
      expect(formatter({ name: '', data: { value: [0.2, 0] } })).toBe(
        '<strong>NoDomain</strong><br/>Domain: Other<br/>SMD: 0.2000'
      )
      expect(formatter({ name: '', data: { value: [0, 9] } })).toBe(
        '<strong></strong><br/>Domain: <br/>SMD: 0.0000'
      )
    })

    it('shows at most the 30 largest differences and grows the chart to fit', () => {
      const rows = Array.from({ length: 31 }, (_, i) => prev(`Cov${i}`, {}, { stdDiff: (i + 1) / 100 }))
      const w = mountView({ prevalence: rows })

      const chart = onlyChart(w)
      const names = optionOf(chart).yAxis.data as string[]
      expect(names).toHaveLength(30)
      expect(names).not.toContain('Cov0')
      expect(names[29]).toBe('Cov30')
      expect(heightOf(chart)).toBe('740px')
    })
  })

  describe('single-cohort top covariates', () => {
    it('charts positive prevalences in ascending order for the bar layout', () => {
      const w = mountView({
        cohorts: ONE,
        prevalence: [
          prev('Low', overall({ '1': 5 })),
          prev('High', { s: { '1': 1 }, overall: { '1': 60 } }),
          prev('Zero', overall({ '1': 0 })),
          prev('Mid', { first: { '1': 20 } }),
          prev('OtherCohort', overall({ '2': 99 })),
        ],
      })

      expect(headings(w)).toEqual(['Top Covariates by Prevalence'])
      const chart = onlyChart(w)
      expect(optionOf(chart)).toEqual({
        tooltip: { trigger: 'item', formatter: expect.any(Function) },
        grid: { top: 10, right: 40, bottom: 30, left: 200 },
        xAxis: pctAxis,
        yAxis: {
          type: 'category',
          data: ['Low', 'Mid', 'High'],
          axisLabel: { fontSize: 10, width: 180, overflow: 'truncate' },
        },
        series: [{ type: 'bar', data: [5, 20, 60], itemStyle: { color: '#4e79a7' }, barMaxWidth: 16 }],
      })
      expect(heightOf(chart)).toBe('300px')
      expect(w.find('.char-dashboard__empty').exists()).toBe(false)
    })

    it('formats the bar tooltip as a percentage', () => {
      const w = mountView({ cohorts: ONE, prevalence: [prev('X', overall({ '1': 1 }))] })

      const formatter = optionOf(onlyChart(w)).tooltip.formatter
      expect(formatter({ name: 'Asthma', value: 3.14159 })).toBe('Asthma: 3.14%')
    })

    it('keeps only the 20 most prevalent covariates', () => {
      const rows = Array.from({ length: 25 }, (_, i) => prev(`Cov${i}`, overall({ '1': i + 1 })))
      const w = mountView({ cohorts: ONE, prevalence: rows })

      const chart = onlyChart(w)
      const values = optionOf(chart).series[0].data as number[]
      expect(values).toHaveLength(20)
      expect(values[0]).toBe(6)
      expect(values[19]).toBe(25)
      expect(heightOf(chart)).toBe('560px')
    })
  })
})
