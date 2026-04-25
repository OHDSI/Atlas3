import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionRuleTreemap from '@/components/reports/inclusion/InclusionRuleTreemap.vue'

const vuetify = createVuetify({ components, directives })
// vue-echarts isn't auto-registered in tests; stub <v-chart> with a placeholder.
const global = {
  plugins: [vuetify],
  stubs: { VChart: { template: '<div data-testid="v-chart-stub" />' } },
}

describe('InclusionRuleTreemap', () => {
  it('renders an empty state when treemap is null', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: { treemap: null, ruleCount: 3 },
    })

    expect(wrapper.find('[data-testid=inclusion-treemap-empty]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-treemap]').exists()).toBe(false)
  })

  it('renders the treemap container when children are present', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: {
          name: 'Everyone',
          children: [
            { name: '111', size: 800 },
            { name: '110', size: 200 },
            { name: '000', size: 50 },
          ],
        },
        ruleCount: 3,
      },
    })

    expect(wrapper.find('[data-testid=inclusion-treemap]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=v-chart-stub]').exists()).toBe(true)
  })

  it('exposes a legend describing the all-pass and all-fail extremes', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '11', size: 1 }] },
        ruleCount: 2,
      },
    })

    expect(wrapper.text()).toContain('All 2 rules satisfied')
    expect(wrapper.text()).toContain('0 rules satisfied')
  })
})
