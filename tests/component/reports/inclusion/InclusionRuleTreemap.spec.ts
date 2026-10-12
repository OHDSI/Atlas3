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
      name: 'VChart',
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

  it('colours leaves by failed-rule count and lists only the bands present (Atlas 2)', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '111', size: 5 }, { name: '110', size: 3 }, { name: '000', size: 1 }] },
        ruleCount: 3,
      },
    })

    const text = wrapper.text()
    expect(text).toContain('All rules passed')
    expect(text).toContain('1 rule failed')
    expect(text).toContain('5 or more / all rules failed')
    expect(text).not.toContain('2 rules failed')

    // Leaves get distinct colours from the blue ramp; no in-tile labels
    const option = wrapper.findComponent({ name: 'VChart' }).props('option') as {
      series: { label: { show: boolean }; data: { itemStyle: { color: string } }[] }[]
    }
    const colors = option.series[0]!.data.map(d => d.itemStyle.color)
    expect(new Set(colors).size).toBe(3)
    expect(option.series[0]!.label.show).toBe(false)
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

  it('lists each rule as passed / failed in the tooltip, with count and share', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '110', size: 1 }] },
        ruleCount: 3,
        ruleNames: ['Age', 'Sex', 'Prior drug'],
        baseCount: 1000,
      },
    })
    const vm = wrapper.vm as unknown as { buildTooltip: (info: { name: string; value: number }) => string }

    const html = vm.buildTooltip({ name: '110', value: 200 })
    expect(html).toContain('Persons: 200 (20.00%)')
    expect(html).toContain('2 passed, 1 failed')
    expect(html).toMatch(/✓<\/strong> Age/)
    expect(html).toContain('✗ Prior drug')
  })

  it('escapes rule names and uses the unit label in the tooltip', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '1', size: 1 }] },
        ruleCount: 1,
        ruleNames: ['<img src=x onerror=alert(1)>'],
        unitLabel: 'Events',
      },
    })
    const vm = wrapper.vm as unknown as { buildTooltip: (info: { name: string; value: number }) => string }

    const html = vm.buildTooltip({ name: '1', value: 5 })
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
    expect(html).toContain('Events: 5')
  })

  it('emits the hovered leaf and clears it when the pointer leaves', () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global: {
        ...global,
        stubs: {
          VChart: {
            name: 'VChart',
            props: ['option', 'autoresize'],
            emits: ['mouseover', 'mouseout', 'globalout'],
            template: '<div data-testid="v-chart-stub" />',
          },
        },
      },
      props: { treemap: { name: 'Everyone', children: [{ name: '10', size: 7 }] }, ruleCount: 2 },
    })
    const chart = wrapper.findComponent({ name: 'VChart' })

    chart.vm.$emit('mouseover', { data: { _bitString: '10', value: 7 } })
    chart.vm.$emit('mouseover', { data: { name: 'Group 1' } })
    chart.vm.$emit('globalout')
    expect(wrapper.emitted('leaf-hover')).toEqual([[{ bits: '10', size: 7 }], [null]])
  })

  it('adds a "not in selection" legend entry in the intersect view', async () => {
    const wrapper = mount(InclusionRuleTreemap, {
      global,
      props: {
        treemap: { name: 'Everyone', children: [{ name: '11', size: 1 }] },
        ruleCount: 2,
      },
    })
    expect(wrapper.text()).not.toContain('Not in selection')

    await wrapper.setProps({ selection: { rules: [0], mode: 'any', outcome: 'passed' } })
    expect(wrapper.text()).toContain('Not in selection')
  })
})
