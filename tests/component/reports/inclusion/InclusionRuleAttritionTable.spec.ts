import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import InclusionRuleAttritionTable from '@/components/reports/inclusion/InclusionRuleAttritionTable.vue'

const vuetify = createVuetify({ components, directives })
const plugins = [vuetify, createPinia()] as const

const sampleRules = [
  { id: 0, name: 'No prior diabetes', countSatisfying: 1820, percentSatisfying: '91.00', percentExcluded: '9.00' },
  { id: 1, name: 'Age >= 18', countSatisfying: 1750, percentSatisfying: '87.50', percentExcluded: '12.50' },
  { id: 2, name: 'Has visit', countSatisfying: 200, percentSatisfying: '10.00', percentExcluded: '90.00' },
]

describe('InclusionRuleAttritionTable', () => {
  it('renders one row per rule', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: sampleRules },
    })

    expect(wrapper.findAll('[data-testid=inclusion-attrition-row]')).toHaveLength(3)
  })

  it('formats counts and percent values', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: sampleRules },
    })

    const text = wrapper.text()
    expect(text).toContain('1,820')
    expect(text).toContain('91.00%')
    expect(text).toContain('No prior diabetes')
  })

  it('renders the empty state when no rules are provided', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: [] },
    })

    expect(wrapper.find('[data-testid=inclusion-attrition-empty]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-attrition-table]').exists()).toBe(false)
  })

  it('paints a red bar for low-satisfying rules and green for high', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: sampleRules },
    })

    const bars = wrapper.findAll('.attrition-table__bar-fill')
    // 3-tone Vuetify-theme palette (success ≥ 80%, warning ≥ 40%, error
    // otherwise). Vuetify's CSS variables expand without consistent
    // whitespace between channels, so match with regex.
    const SUCCESS_RX = /rgba\(\s*76\s*,\s*175\s*,\s*80\s*,\s*0\.85\s*\)/
    const ERROR_RX = /rgba\(\s*176\s*,\s*0\s*,\s*32\s*,\s*0\.85\s*\)/
    // Rule 0: 91% → success
    expect((bars[0]!.attributes('style') ?? '').toLowerCase()).toMatch(SUCCESS_RX)
    // Rule 2: 10% → error
    expect((bars[2]!.attributes('style') ?? '').toLowerCase()).toMatch(ERROR_RX)
  })

  it('renders an em-dash for empty / non-numeric percent values', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: {
        rules: [
          { id: 0, name: 'A', countSatisfying: 0, percentSatisfying: '', percentExcluded: '' },
          { id: 1, name: 'B', countSatisfying: 0, percentSatisfying: 'NaN', percentExcluded: 'oops' },
        ],
      },
    })

    const text = wrapper.text()
    // Empty string → em-dash; non-parseable string → echoed back unchanged
    expect(text).toContain('—')
    expect(text).toContain('NaN')
    expect(text).toContain('oops')
  })

  it('renders a cumulative-remaining column when the prop is provided', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: sampleRules, cumulativeRemaining: [1820, 1620, 200] },
    })

    expect(wrapper.find('[data-testid=inclusion-attrition-cumulative-header]').exists()).toBe(true)
    const cells = wrapper.findAll('[data-testid=inclusion-attrition-cumulative-cell]')
    expect(cells).toHaveLength(3)
    expect(cells[1]!.text()).toBe('1,620')
  })

  it('omits the cumulative column when no prop is provided', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: { rules: sampleRules },
    })

    expect(wrapper.find('[data-testid=inclusion-attrition-cumulative-header]').exists()).toBe(false)
  })

  it('clamps and color-grades the bar fill across each threshold band', () => {
    // 3-tone palette: error (< 40%), warning (40–80%), success (≥ 80%).
    // Replaces the prior 5-tone hex palette.
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: {
        rules: [
          { id: 0, name: 'r0', countSatisfying: 1, percentSatisfying: '5', percentExcluded: '95' },     // <40  → error
          { id: 1, name: 'r1', countSatisfying: 1, percentSatisfying: '20', percentExcluded: '80' },    // <40  → error
          { id: 2, name: 'r2', countSatisfying: 1, percentSatisfying: '40', percentExcluded: '60' },    // ≥40  → warning
          { id: 3, name: 'r3', countSatisfying: 1, percentSatisfying: '60', percentExcluded: '40' },    // ≥40  → warning
          { id: 4, name: 'r4', countSatisfying: 1, percentSatisfying: '90', percentExcluded: '10' },    // ≥80  → success
          { id: 5, name: 'r5', countSatisfying: 1, percentSatisfying: '999', percentExcluded: '0' },    // clamp to 100 → success
          { id: 6, name: 'r6', countSatisfying: 1, percentSatisfying: '-5', percentExcluded: '105' },   // clamp to 0  → error
        ],
      },
    })

    // Vuetify default theme triplets (whitespace inside parens isn't
    // normalised, so match digits with regex):
    //   error → rgba(176, 0, 32, …)
    //   warning → rgba(251, 140, 0, …)
    //   success → rgba(76, 175, 80, …)
    const ERROR = /rgba\(\s*176\s*,\s*0\s*,\s*32\s*,\s*0\.85\s*\)/
    const WARNING = /rgba\(\s*251\s*,\s*140\s*,\s*0\s*,\s*0\.85\s*\)/
    const SUCCESS = /rgba\(\s*76\s*,\s*175\s*,\s*80\s*,\s*0\.85\s*\)/
    const bars = wrapper.findAll('.attrition-table__bar-fill')
    const styles = bars.map(b => (b.attributes('style') ?? '').toLowerCase())
    expect(styles[0]!).toMatch(ERROR)
    expect(styles[1]!).toMatch(ERROR)
    expect(styles[2]!).toMatch(WARNING)
    expect(styles[3]!).toMatch(WARNING)
    expect(styles[4]!).toMatch(SUCCESS)
    expect(styles[5]!).toContain('width: 100%')
    expect(styles[5]!).toMatch(SUCCESS)
    expect(styles[6]!).toContain('width: 0%')
    expect(styles[6]!).toMatch(ERROR)
  })
})
