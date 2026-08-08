import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'

vi.mock('@/services/report.service', () => ({
  getInclusionRuleReport: vi.fn(),
}))

import InclusionRuleReport from '@/components/reports/inclusion/InclusionRuleReport.vue'
import { getInclusionRuleReport } from '@/services/report.service'
import { ApiError } from '@/services/api-error'

const vuetify = createVuetify({ components, directives })
const global = {
  plugins: [vuetify, createPinia()],
  stubs: { VChart: { template: '<div data-testid="v-chart-stub" />' } },
}

const fullReport = {
  summary: { baseCount: 1000, finalCount: 820, lostCount: 180, percentMatched: '82.00' },
  inclusionRuleStats: [
    { id: 0, name: 'No prior diabetes', countSatisfying: 950, percentSatisfying: '95.00', percentExcluded: '5.00' },
  ],
  treemap: { name: 'Everyone', children: [{ name: '1', size: 820 }] },
}

const fetchMock = vi.mocked(getInclusionRuleReport)

describe('InclusionRuleReport', () => {
  beforeEach(() => fetchMock.mockReset())

  it('renders an error state, not the empty state, when the report response fails validation', async () => {
    // A schema-invalid response used to come back as `null` and render as the
    // empty state, indistinguishable from a cohort with no inclusion rules.
    // It now carries a real ApiError, so it must render as an error instead.
    fetchMock.mockResolvedValueOnce({
      success: false,
      error: new ApiError('Invalid inclusion-rule report response', 0, null),
    })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=inclusion-rule-report-error]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-rule-report-empty]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=inclusion-summary-final-count]').exists()).toBe(false)
  })

  it('renders the error state (not the empty state) when the fetch fails', async () => {
    fetchMock.mockRejectedValueOnce(new Error('HTTP 500'))

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=inclusion-rule-report-error]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-rule-report-empty]').exists()).toBe(false)
    expect(wrapper.text()).toContain('HTTP 500')
  })

  it('renders summary, attrition table and treemap when data arrives', async () => {
    fetchMock.mockResolvedValueOnce({ success: true, data: fullReport })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=inclusion-summary-final-count]').exists()).toBe(true)
    expect(wrapper.text()).toContain('820') // formatted finalCount
    expect(wrapper.text()).toContain('82.00%') // percent match rate
    expect(wrapper.find('[data-testid=inclusion-attrition-table]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=inclusion-treemap]').exists()).toBe(true)
  })

  it('renders an em-dash when the match-rate percent is null', async () => {
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: { ...fullReport, summary: { ...fullReport.summary, percentMatched: null } },
    })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=inclusion-summary-match-rate]').text()).toContain('—')
  })

  it('refetches with the correct mode when the user switches the tab', async () => {
    fetchMock.mockResolvedValue({ success: true, data: fullReport })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 7, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(7, 'EUNOMIA', 1) // default mode = By Person

    // Trigger a mode switch via the underlying state (clicking the v-tab in jsdom is brittle)
    const vm = wrapper.vm as unknown as { mode: number }
    vm.mode = 0
    await flushPromises()

    expect(fetchMock).toHaveBeenLastCalledWith(7, 'EUNOMIA', 0)
  })

  it('surfaces fetch errors as an error alert', async () => {
    fetchMock.mockResolvedValueOnce({
      success: false,
      error: new ApiError('network down', 0, null),
    })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    const alert = wrapper.find('[data-testid=inclusion-rule-report-error]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('network down')
  })

  it('does not call fetch until both cohortId and sourceKey are non-zero', async () => {
    mount(InclusionRuleReport, {
      global,
      props: { cohortId: 0, sourceKey: '' },
    })
    await flushPromises()

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('falls back to a generic error message when the rejection is not an Error instance', async () => {
    // String rejection — exercises the non-Error branch of the catch handler
    fetchMock.mockRejectedValueOnce('boom')

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    const alert = wrapper.find('[data-testid=inclusion-rule-report-error]')
    expect(alert.exists()).toBe(true)
    expect(alert.text()).toContain('Failed to load the inclusion-rule report.')
  })

  it('echoes the percent string back when it is a non-numeric value', async () => {
    fetchMock.mockResolvedValueOnce({
      success: true,
      data: { ...fullReport, summary: { ...fullReport.summary, percentMatched: 'unknown' } },
    })

    const wrapper = mount(InclusionRuleReport, {
      global,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=inclusion-summary-match-rate]').text()).toContain('unknown')
  })
})
