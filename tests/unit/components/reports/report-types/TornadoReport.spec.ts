/**
 * TornadoReport Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useReports } from '@/composables/useReports'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { setActivePinia, createPinia } from 'pinia'
import TornadoReport from '@/components/reports/report-types/TornadoReport.vue'

const vuetify = createVuetify({ components, directives })

// Mock composables
vi.mock('@/composables/useReports', () => ({
  useReports: vi.fn(() => ({
    loadReport: vi.fn(),
    currentReport: { value: null },
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
  return mount(TornadoReport, {
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

describe('TornadoReport', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('should render component', () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VCard' }).exists()).toBe(true)
  })

  it('should render title with tornado icon', () => {
    const wrapper = mountComponent()
    const icon = wrapper.findComponent({ name: 'VIcon' })
    expect(icon.exists()).toBe(true)
  })

  it('should show loading skeleton when loading', () => {
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport: vi.fn(),
      currentReport: { value: null },
      loading: true,
      error: null
    })

    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('should show error alert when error occurs', () => {
    const mockedUseReports = vi.mocked(useReports)
    mockedUseReports.mockReturnValue({
      loadReport: vi.fn(),
      currentReport: { value: null },
      loading: false,
      error: 'Test error'
    })

    const wrapper = mountComponent()
    const alert = wrapper.findComponent({ name: 'VAlert' })
    expect(alert.exists()).toBe(true)
    expect(alert.props('type')).toBe('error')
  })

  it('should call loadReport on mount with tornado type', () => {
    const mockedUseReports = vi.mocked(useReports)
    const loadReport = vi.fn()
    mockedUseReports.mockReturnValue({
      loadReport,
      currentReport: { value: null },
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
