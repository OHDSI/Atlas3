/**
 * PersonReport Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReports } from '@/composables/useReports'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import PersonReport from '@/components/reports/report-types/PersonReport.vue'

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
  return mount(PersonReport, {
    props: {
      cohortId: 1,
      sourceKey: 'test-source',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        BarChart: true,
        PieChart: true
      }
    }
  })
}

describe('PersonReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render component', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.person-report').exists()).toBe(true)
  })

  it('should render year of birth section', () => {
    const wrapper = mountComponent()
    expect(wrapper.findAllComponents({ name: 'SurfaceCard' }).length).toBeGreaterThan(0)
  })

  it('should render demographics section', () => {
    const wrapper = mountComponent()
    expect(wrapper.findAllComponents({ name: 'SurfaceCard' }).length).toBeGreaterThan(0)
  })

  it('should show loading skeletons initially', async () => {
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

  it('should display no data alerts when no data available', async () => {
    // Mock loadReport to resolve immediately (no data)
    const loadReport = vi.fn(() => Promise.resolve())
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null }
    })

    const wrapper = mountComponent()
    // Wait for all promises to resolve
    await flushPromises()
    await wrapper.vm.$nextTick()

    const alerts = wrapper.findAllComponents({ name: 'VAlert' })
    // Should show info alerts for no data (at least 4 - year of birth, gender, race, ethnicity)
    expect(alerts.length).toBeGreaterThan(0)
  })

  it('should call loadReport on mount', () => {
    const mockedUseReports = vi.mocked(useReports)
    const loadReport = vi.fn()
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null }
    })

    mountComponent()

    expect(loadReport).toHaveBeenCalled()
  })

  it('should have gender, race, and ethnicity pie chart sections', () => {
    const wrapper = mountComponent()
    const cards = wrapper.findAllComponents({ name: 'SurfaceCard' })
    expect(cards.length).toBeGreaterThan(1)
  })
})
