import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import InclusionRuleTreemap from '@/components/reports/inclusion/InclusionRuleTreemap.vue'

const vuetify = createVuetify({ components, directives })
// vue-echarts isn't auto-registered in tests; stub <v-chart> with a component
// that *declares* the `option` prop so Vue evaluates the bound `chartOption`
// computed (and its nested `decorate()` helper) for coverage.
const global = {
  plugins: [vuetify, createPinia()],
  stubs: {
    VChart: {
      props: ['option', 'autoresize'],
      template: '<div data-testid="v-chart-stub" />',
    },
  },
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

    // Legend migrated from per-cohort labels ("All N rules satisfied",
    // "0 rules satisfied") to a 3-band threshold palette aligned with
    // the funnel / attrition table.
    const text = wrapper.text()
    expect(text).toContain('≥ 80% rules satisfied')
    expect(text).toContain('< 40% rules satisfied')
  })

  it('shows a "no inclusion rules" legend when ruleCount is 0', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '', size: 1 }] },
        ruleCount: 0,
      },
    })

    // Treemap container still renders because there are children
    expect(wrapper.find('[data-testid=inclusion-treemap]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No inclusion rules')
  })

  it('renders the empty state when treemap has no children', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [] },
        ruleCount: 3,
      },
    })

    expect(wrapper.find('[data-testid=inclusion-treemap-empty]').exists()).toBe(true)
  })

  it('handles a leaf with an empty name (failuresFromName empty-string branch)', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '', size: 1 }] },
        ruleCount: 3,
      },
    })

    expect(wrapper.find('[data-testid=inclusion-treemap]').exists()).toBe(true)
  })

  it('decorates a tree with nested children (covers the non-leaf branch)', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: {
          name: 'Everyone',
          children: [
            {
              name: 'group-a',
              children: [
                { name: '11', size: 100 },
                { name: '00', size: 50 },
              ],
            },
            { name: '11', size: 200 },
          ],
        },
        ruleCount: 2,
      },
    })

    // The v-chart stub renders, which means chartOption (and decorate)
    // ran during template setup — that's enough to exercise both branches
    // of the leaf check inside decorate().
    expect(wrapper.find('[data-testid=v-chart-stub]').exists()).toBe(true)
  })

  it('formats the tooltip showing rules satisfied vs total', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '110', size: 1 }] },
        ruleCount: 3,
      },
    })

    const vm = wrapper.vm as unknown as { buildTooltip: (info: { name: string; value: number }, ruleCount: number) => string }

    // '110' = rule 1 pass, rule 2 pass, rule 3 fail → 1 failure → 2 of 3 satisfied
    expect(vm.buildTooltip({ name: '110', value: 200 }, 3)).toContain('Rules satisfied: 2 of 3')
    expect(vm.buildTooltip({ name: '110', value: 200 }, 3)).toContain('Persons: 200')

    // empty name → labelled "(root)"
    expect(vm.buildTooltip({ name: '', value: 1000 }, 3)).toContain('(root)')
  })
})
