import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SummaryStat from '@/components/reports/inclusion/SummaryStat.vue'

describe('SummaryStat', () => {
  it('renders the label and value passed in', () => {
    const wrapper = mount(SummaryStat, { props: { label: 'Match rate', value: '82.50%' } })
    expect(wrapper.text()).toContain('Match rate')
    expect(wrapper.text()).toContain('82.50%')
  })

  it('treats props as plain strings (no HTML interpolation)', () => {
    const wrapper = mount(SummaryStat, { props: { label: '<b>x</b>', value: '<i>y</i>' } })
    expect(wrapper.html()).not.toContain('<b>')
    expect(wrapper.html()).not.toContain('<i>')
    expect(wrapper.text()).toContain('<b>x</b>')
    expect(wrapper.text()).toContain('<i>y</i>')
  })
})
