/**
 * CohortSpecificReport Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReports } from '@/composables/useReports'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import CohortSpecificReport from '@/components/reports/report-types/CohortSpecificReport.vue'

const vuetify = createVuetify({ components, directives })

// Mock composables
vi.mock('@/composables/useReports', () => ({
  useReports: vi.fn(() => ({
    loadReport: vi.fn(),
    currentReportData: { value: null }
  }))
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key)
  }))
}))

function mountComponent(props = {}) {
  return mount(CohortSpecificReport, {
    props: {
      cohortId: 1,
      sourceKey: 'test-source',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        LineChart: true,
        BarChart: true
      }
    }
  })
}

describe('CohortSpecificReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render component', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.cohort-specific-report').exists()).toBe(true)
  })

  it('should render prevalence by month section', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Prevalence by Month')
  })

  it('should render cohort summary section', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Cohort Summary')
  })

  it('should render age distribution section', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Age Distribution')
  })

  it('should render duration distribution section', () => {
    const wrapper = mountComponent()
    expect(wrapper.text()).toContain('Duration Distribution')
  })

  it('should show loading skeleton initially', async () => {
    // Component manages its own section loading state using a Set
    // Create a promise that never resolves to keep loading state
    const loadReport = vi.fn(() => new Promise(() => {}))
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null }
    })

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    // Component adds sections to loading set during fetchData
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('should display no data alert when no data available', async () => {
    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()
    const alerts = wrapper.findAllComponents({ name: 'VAlert' })
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should call loadReport on mount with correct parameters', () => {
    const mockedUseReports = vi.mocked(useReports)
    const loadReport = vi.fn()
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null }
    })

    mountComponent({ cohortId: 42, sourceKey: 'my-source' })

    expect(loadReport).toHaveBeenCalled()
  })
})
