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

  type IntersectVm = {
    view: string
    mode: number
    selectedRules: number[]
    intersectMode: string
    intersectOutcome: string
  }
  const fmt = (n: number) => new Intl.NumberFormat().format(n)

  async function openIntersect(cohortId = 7) {
    const wrapper = await mountReport(cohortId)
    const vm = wrapper.vm as unknown as IntersectVm
    vm.view = 'intersect'
    await flushPromises()
    const result = () => wrapper.find('[data-testid="inclusion-intersect-result"]').text()
    return { wrapper, vm, result }
  }

  it('counts persons for the checked rules in the intersect view (#372)', async () => {
    const { wrapper, vm, result } = await openIntersect()

    // Atlas 2 defaults: every rule checked, "any" rule "passed"
    expect(vm.selectedRules).toEqual([0, 1])
    expect(vm.intersectMode).toBe('any')
    expect(vm.intersectOutcome).toBe('passed')
    expect(result()).toContain(fmt(511 + 1437 + 225))
    expect(wrapper.find('[data-testid="inclusion-attrition-table"]').exists()).toBe(false)

    vm.intersectMode = 'all'
    await flushPromises()
    expect(result()).toContain(fmt(511))

    await wrapper.find('[data-testid="inclusion-intersect-rule-0"] input').setValue(false)
    expect(vm.selectedRules).toEqual([1])
    expect(result()).toContain(fmt(511 + 1437))
    expect(wrapper.find('[data-testid="inclusion-intersect-row-0"]').classes()).toContain(
      'intersect-table__row--off'
    )

    vm.intersectOutcome = 'failed'
    await flushPromises()
    expect(result()).toContain(fmt(225 + 516))
  })

  it('header checkbox clears and re-checks every rule', async () => {
    const { wrapper, vm, result } = await openIntersect()
    const selectAll = () => wrapper.find('[data-testid="inclusion-intersect-select-all"] input')

    await selectAll().setValue(false)
    expect(vm.selectedRules).toEqual([])
    expect(result()).toContain('Select at least one rule')

    await selectAll().setValue(true)
    expect(vm.selectedRules).toEqual([0, 1])
  })

  it('resets the selection when a different cohort loads', async () => {
    const { wrapper, vm } = await openIntersect()
    vm.selectedRules = [1]
    vm.intersectMode = 'all'

    vm.mode = 0
    await flushPromises()
    expect(vm.selectedRules).toEqual([1])

    await wrapper.setProps({ cohortId: 8 })
    await flushPromises()
    expect(vm.selectedRules).toEqual([0, 1])
    expect(vm.intersectMode).toBe('any')
  })

  it('talks about events, not persons, in By Event mode', async () => {
    const { vm, result } = await openIntersect()
    expect(result()).toContain('persons')

    vm.mode = 0
    await flushPromises()
    expect(result()).toContain('events')
    expect(result()).not.toContain('persons')
  })

  it('describes the hovered treemap box and marks each rule passed / failed (Atlas 2)', async () => {
    const { wrapper } = await openIntersect()
    const vm = wrapper.vm as unknown as { hoveredLeaf: { bits: string; size: number } | null }
    const summary = () => wrapper.find('[data-testid="inclusion-hover-summary"]').text()
    expect(summary()).toContain('Hover over a box')

    vm.hoveredLeaf = { bits: '10', size: 225 }
    await flushPromises()
    expect(summary()).toBe(`${fmt(225)} persons (8.37%), 1 rules passed, 1 rules failed`)
    expect(wrapper.find('[data-testid="inclusion-intersect-row-0"]').classes()).toContain('intersect-table__row--pass')
    expect(wrapper.find('[data-testid="inclusion-intersect-row-1"]').classes()).toContain('intersect-table__row--fail')
  })

  it('switches between attrition and intersect with tabs', async () => {
    const wrapper = await mountReport()
    expect(wrapper.find('[data-testid="inclusion-attrition-table"]').exists()).toBe(true)

    await wrapper.find('[data-testid="inclusion-view-intersect"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="inclusion-intersect"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="inclusion-attrition-table"]').exists()).toBe(false)
  })

  it('labels a rule saved without a name instead of leaving it blank', async () => {
    const { getInclusionRuleReport } = await import('@/services/report.service')
    vi.mocked(getInclusionRuleReport).mockResolvedValueOnce({
      success: true,
      data: { ...report, inclusionRuleStats: [report.inclusionRuleStats[0], { ...report.inclusionRuleStats[1], name: '' }] },
    } as never)

    const wrapper = await mountReport()
    const vm = wrapper.vm as unknown as { report: { inclusionRuleStats: { name: string }[] } }
    expect(vm.report.inclusionRuleStats.map(r => r.name)).toEqual(['Has Osteoarthritis', 'Inclusion rule 2'])
  })

  it('hides the view toggle until a report with rules has loaded', async () => {
    const { getInclusionRuleReport } = await import('@/services/report.service')
    vi.mocked(getInclusionRuleReport).mockResolvedValueOnce({
      success: true,
      data: { ...report, inclusionRuleStats: [], treemap: null },
    } as never)

    const wrapper = await mountReport()
    expect(wrapper.find('[data-testid="inclusion-view"]').exists()).toBe(false)

    const withRules = await mountReport()
    expect(withRules.find('[data-testid="inclusion-view"]').exists()).toBe(true)
  })
})
