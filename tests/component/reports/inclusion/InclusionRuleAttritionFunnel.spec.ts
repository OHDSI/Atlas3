import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionRuleAttritionFunnel from '@/components/reports/inclusion/InclusionRuleAttritionFunnel.vue'
import type { InclusionRuleReport } from '@/models/report.types'

const vuetify = createVuetify({ components, directives })
const global = {
  plugins: [vuetify],
  stubs: {
    VChart: {
      props: ['option', 'autoresize'],
      template: '<div data-testid="v-chart-stub" />',
    },
  },
}

function makeReport(overrides: Partial<InclusionRuleReport> = {}): InclusionRuleReport {
  return {
    summary: { baseCount: 2689, finalCount: 511, lostCount: 2178, percentMatched: '19.0' },
    inclusionRuleStats: [
      {
        id: 0,
        name: 'Has Osteoarthritis',
        countSatisfying: 736,
        percentSatisfying: '27.37',
        percentExcluded: '72.63',
      },
      {
        id: 1,
        name: 'Has Otitis media',
        countSatisfying: 1948,
        percentSatisfying: '72.45',
        percentExcluded: '27.55',
      },
    ],
    treemap: {
      name: 'Everyone',
      children: [
        { name: '11', size: 511 },
        { name: '01', size: 1437 },
        { name: '10', size: 225 },
        { name: '00', size: 516 },
      ],
    },
    ...overrides,
  }
}

interface FunnelInternals {
  steps: Array<{ label: string; remaining: number; percentOfInitial: number }>
  chartOption: { series: Array<{ data: Array<{ name: string; value: number; itemStyle: { color: string } }> }> }
  retentionColor: (pct: number) => string
}

describe('InclusionRuleAttritionFunnel', () => {
  it('renders empty state when no inclusion rules', () => {
    const wrapper = mount(InclusionRuleAttritionFunnel, {
      global,
      props: {
        report: makeReport({
          inclusionRuleStats: [],
          summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: null },
        }),
      },
    })

    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-empty]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-chart]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-csv]').exists()).toBe(false)
  })

  it('renders chart and footer when steps are present', () => {
    const wrapper = mount(InclusionRuleAttritionFunnel, {
      global,
      props: { report: makeReport() },
    })

    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-chart]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-footer]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-attrition-funnel-csv]').exists()).toBe(true)
  })

  it('builds funnel data from cumulative attrition steps', () => {
    const wrapper = mount(InclusionRuleAttritionFunnel, {
      global,
      props: { report: makeReport() },
    })
    const vm = wrapper.vm as unknown as FunnelInternals

    const data = vm.chartOption.series[0]!.data
    expect(data).toHaveLength(3)
    expect(data[0]!.name).toBe('Initial Population')
    expect(data[0]!.value).toBe(2689)
    expect(data[1]!.name).toBe('Has Osteoarthritis')
    expect(data[1]!.value).toBe(736)
    expect(data[2]!.name).toBe('Has Otitis media')
    expect(data[2]!.value).toBe(511)
  })

  it('color-codes each segment by retention %', () => {
    const wrapper = mount(InclusionRuleAttritionFunnel, {
      global,
      props: { report: makeReport() },
    })
    const vm = wrapper.vm as unknown as FunnelInternals

    expect(vm.retentionColor(100)).toBe('#34c759')
    expect(vm.retentionColor(75)).toBe('#ff9500')
    expect(vm.retentionColor(0)).toBe('#ff3b30')

    const colors = vm.chartOption.series[0]!.data.map(d => d.itemStyle.color)
    expect(colors[0]).toBe('#34c759') // Initial population: 100%
    // Final ~19% retention should be in the amber→red zone
    expect(colors[2]).not.toBe('#34c759')
  })

  describe('CSV export', () => {
    let createObjectURL: ReturnType<typeof vi.fn>
    let revokeObjectURL: ReturnType<typeof vi.fn>
    let csvTexts: string[]

    beforeEach(() => {
      csvTexts = []
      const OriginalBlob = globalThis.Blob
      class CapturingBlob extends OriginalBlob {
        constructor(parts: BlobPart[] = [], opts?: BlobPropertyBag) {
          super(parts, opts)
          const text = parts
            .map(p => (typeof p === 'string' ? p : ''))
            .join('')
          csvTexts.push(text)
        }
      }
      vi.stubGlobal('Blob', CapturingBlob)

      createObjectURL = vi.fn(() => 'blob:mock')
      revokeObjectURL = vi.fn()
      Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true })
      Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
      vi.restoreAllMocks()
    })

    it('produces a CSV with one row per step', async () => {
      const wrapper = mount(InclusionRuleAttritionFunnel, {
        global,
        props: { report: makeReport() },
      })

      await wrapper.find('[data-testid=inclusion-attrition-funnel-csv]').trigger('click')

      expect(createObjectURL).toHaveBeenCalledTimes(1)
      const text = csvTexts[0]!
      const lines = text.split('\n')
      expect(lines[0]).toBe('Step,Rule,Remaining,Excluded,Percent of Initial')
      expect(lines).toHaveLength(4) // header + 3 steps
      expect(lines[1]).toBe('0,"Initial Population",2689,0,100.0')
      expect(lines[2]).toContain('Has Osteoarthritis')
      expect(lines[2]).toContain('736')
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock')
    })

    it('escapes quotes in rule names', async () => {
      const wrapper = mount(InclusionRuleAttritionFunnel, {
        global,
        props: {
          report: makeReport({
            inclusionRuleStats: [
              {
                id: 0,
                name: 'Has "Type 2" Diabetes',
                countSatisfying: 100,
                percentSatisfying: '50',
                percentExcluded: '50',
              },
            ],
            treemap: null,
          }),
        },
      })

      await wrapper.find('[data-testid=inclusion-attrition-funnel-csv]').trigger('click')

      const text = csvTexts[0]!
      expect(text).toContain('"Has ""Type 2"" Diabetes"')
    })
  })

  it('falls back to per-rule countSatisfying when treemap is null', () => {
    const wrapper = mount(InclusionRuleAttritionFunnel, {
      global,
      props: {
        report: makeReport({
          treemap: null,
          summary: { baseCount: 1000, finalCount: 300, lostCount: 700, percentMatched: '30' },
          inclusionRuleStats: [
            {
              id: 0,
              name: 'A',
              countSatisfying: 500,
              percentSatisfying: '50',
              percentExcluded: '50',
            },
            {
              id: 1,
              name: 'B',
              countSatisfying: 300,
              percentSatisfying: '30',
              percentExcluded: '70',
            },
          ],
        }),
      },
    })

    const vm = wrapper.vm as unknown as FunnelInternals
    expect(vm.steps.map(s => s.remaining)).toEqual([1000, 500, 300])
  })
})
