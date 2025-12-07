/**
 * ConditionErasReport Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReports } from '@/composables/useReports'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import ConditionErasReport from '@/components/reports/report-types/ConditionErasReport.vue'

const vuetify = createVuetify({ components, directives })

// Mock composables
vi.mock('@/composables/useReports', () => ({
  useReports: vi.fn(() => ({
    loadReport: vi.fn(),
    currentReportData: { value: null },
    loading: false,
    error: null
  }))
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: vi.fn(() => ({
    t: vi.fn((key: string) => key)
  }))
}))

function mountComponent(props = {}) {
  return mount(ConditionErasReport, {
    props: {
      cohortId: 1,
      sourceKey: 'test-source',
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        DataTable: true
      }
    }
  })
}

describe('ConditionErasReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render component', () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VCard' }).exists()).toBe(true)
  })

  it('should render icon', () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VIcon' }).exists()).toBe(true)
  })

  it('should show loading skeleton when loading', async () => {
    // Component manages its own loading state internally via ref()
    // Create a promise that never resolves to keep loading state
    const loadReport = vi.fn(() => new Promise(() => {}))
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null },
      loading: false,
      error: null
    })

    const wrapper = mountComponent()
    await wrapper.vm.$nextTick()

    // Component uses internal loading ref set to true during fetchData
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('should show error alert when error occurs', async () => {
    // Component manages its own error state by catching exceptions
    const loadReport = vi.fn(() => Promise.reject(new Error('Test error')))
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null },
      loading: false,
      error: null
    })

    const wrapper = mountComponent()
    // Wait for all promises to settle
    await flushPromises()
    await wrapper.vm.$nextTick()

    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.exists()).toBe(true)
    expect(alert.props('type')).toBe('error')
  })

  it('should call loadReport on mount', () => {
    const mockedUseReports = vi.mocked(useReports)
    const loadReport = vi.fn()
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReportData: { value: null },
      loading: false,
      error: null
    })

    mountComponent()

    expect(loadReport).toHaveBeenCalled()
  })

  it('should have divider', () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VDivider' }).exists()).toBe(true)
  })
})
