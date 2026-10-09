import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import type { InclusionRuleReport as Report } from '@/models/report.types'

const report: Report = {
  summary: { baseCount: 2689, finalCount: 511, lostCount: 2178, percentMatched: '19.00' },
  inclusionRuleStats: [
    { id: 0, name: 'Has Osteoarthritis', countSatisfying: 736, percentSatisfying: '27.37', percentExcluded: '72.63' },
    { id: 1, name: 'Has Otitis media', countSatisfying: 1948, percentSatisfying: '72.45', percentExcluded: '27.55' },
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
}

vi.mock('@/services/report.service', () => ({
  getInclusionRuleReport: vi.fn(async () => ({ success: true, data: report })),
}))

vi.mock('@/components/reports/inclusion/InclusionRuleAttritionFunnel.vue', () => ({
  __esModule: true,
  default: {
    name: 'InclusionRuleAttritionFunnel',
    props: ['report', 'initialLabel'],
    template: '<div data-testid="stub-funnel">{{ initialLabel }}</div>',
  },
}))

import InclusionRuleReport from '@/components/reports/inclusion/InclusionRuleReport.vue'

const vuetify = createVuetify({ components, directives })

async function mountReport(cohortId = 7) {
  const wrapper = mount(InclusionRuleReport, {
    props: { cohortId, sourceKey: 'CCAE' },
    global: { plugins: [vuetify], stubs: { 'v-chart': true } },
  })
  await flushPromises()
  return wrapper
}

describe('InclusionRuleReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('shows the initial population as row 0 of the attrition table (#371)', async () => {
    const wrapper = await mountReport()
    const row = wrapper.find('[data-testid="inclusion-attrition-initial-row"]')

    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('Initial population')
    expect(wrapper.find('[data-testid="inclusion-attrition-initial-count"]').text()).toBe(
      new Intl.NumberFormat().format(2689)
    )
  })

  it('applies a custom initial population label and keeps it per cohort (#375)', async () => {
    const wrapper = await mountReport()
    await wrapper.find('[data-testid="inclusion-initial-label"] input').setValue('Adults with sinusitis')

    expect(wrapper.find('[data-testid="inclusion-attrition-initial-row"]').text()).toContain(
      'Adults with sinusitis'
    )
    expect(wrapper.find('[data-testid="stub-funnel"]').text()).toBe('Adults with sinusitis')

    const reopened = await mountReport()
    expect(reopened.find('[data-testid="stub-funnel"]').text()).toBe('Adults with sinusitis')

    const otherCohort = await mountReport(8)
    expect(otherCohort.find('[data-testid="stub-funnel"]').text()).toBe('Initial population')
  })

  it('counts persons for the checked rules in the intersect view (#372)', async () => {
    const wrapper = await mountReport()
    const vm = wrapper.vm as unknown as {
      view: string
      selectedRules: number[]
      intersectMode: string
    }

    vm.view = 'intersect'
    await flushPromises()
    const result = () => wrapper.find('[data-testid="inclusion-intersect-result"]').text()
    const fmt = (n: number) => new Intl.NumberFormat().format(n)

    // Every rule checked + "all" reproduces the final count
    expect(result()).toContain(fmt(511))
    expect(wrapper.find('[data-testid="inclusion-attrition-table"]').exists()).toBe(false)

    await wrapper.find('[data-testid="inclusion-intersect-rule-0"] input').setValue(false)
    expect(vm.selectedRules).toEqual([1])
    expect(result()).toContain(fmt(511 + 1437))

    vm.intersectMode = 'any'
    vm.selectedRules = [0, 1]
    await flushPromises()
    expect(result()).toContain(fmt(511 + 1437 + 225))
  })
})
