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
    // Rule 0: 91% → green palette
    expect((bars[0]!.attributes('style') ?? '').toLowerCase()).toContain('rgb(123, 178, 9)') // #7BB209
    // Rule 2: 10% → orange/red palette
    expect((bars[2]!.attributes('style') ?? '').toLowerCase()).toContain('rgb(231, 127, 19)') // #E77F13
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

  it('clamps and color-grades the bar fill across each threshold band', () => {
    const wrapper = mount(InclusionRuleAttritionTable, {
      global: { plugins },
      props: {
        rules: [
          { id: 0, name: 'r0', countSatisfying: 1, percentSatisfying: '5', percentExcluded: '95' },     // <10  → red    #FF3D19
          { id: 1, name: 'r1', countSatisfying: 1, percentSatisfying: '20', percentExcluded: '80' },    // <25  → orange #E77F13
          { id: 2, name: 'r2', countSatisfying: 1, percentSatisfying: '40', percentExcluded: '60' },    // <50  → yellow #C9C40D
          { id: 3, name: 'r3', countSatisfying: 1, percentSatisfying: '60', percentExcluded: '40' },    // <75  → light  #95B90A
          { id: 4, name: 'r4', countSatisfying: 1, percentSatisfying: '90', percentExcluded: '10' },    // ≥75  → green  #7BB209
          { id: 5, name: 'r5', countSatisfying: 1, percentSatisfying: '999', percentExcluded: '0' },    // clamp to 100
          { id: 6, name: 'r6', countSatisfying: 1, percentSatisfying: '-5', percentExcluded: '105' },   // clamp to 0
        ],
      },
    })

    const bars = wrapper.findAll('.attrition-table__bar-fill')
    const styles = bars.map(b => (b.attributes('style') ?? '').toLowerCase())
    expect(styles[0]!).toContain('rgb(255, 61, 25)')   // #FF3D19
    expect(styles[1]!).toContain('rgb(231, 127, 19)')  // #E77F13
    expect(styles[2]!).toContain('rgb(201, 196, 13)')  // #C9C40D
    expect(styles[3]!).toContain('rgb(149, 185, 10)')  // #95B90A
    expect(styles[4]!).toContain('rgb(123, 178, 9)')   // #7BB209
    expect(styles[5]!).toContain('width: 100%')        // clamp upper
    expect(styles[6]!).toContain('width: 0%')          // clamp lower
  })
})
