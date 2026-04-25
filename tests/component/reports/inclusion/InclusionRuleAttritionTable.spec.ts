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
})
