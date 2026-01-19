/**
 * DataSourcesView Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import DataSourcesView from '@/views/DataSourcesView.vue'
import { useDataSourcesStore } from '@/stores/datasources'
import { createMockDataSource } from '@/../tests/helpers/mock-factories'
import type { DashboardReport } from '@/models/datasource.types'

// Mock vue-router
const mockPush = vi.fn()
const mockRoute = { params: {} }

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => mockRoute,
}))

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback),
  }),
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock datasource service
const mockListDataSources = vi.fn()
const mockGetDashboardReport = vi.fn()

vi.mock('@/services/datasource.service', () => ({
  listDataSources: () => mockListDataSources(),
  getDashboardReport: (sourceKey: string) => mockGetDashboardReport(sourceKey),
  getDataDensityReport: vi.fn(),
  getPersonReport: vi.fn(),
  getObservationPeriodReport: vi.fn(),
  getDeathReport: vi.fn(),
  getClinicalDomainReport: vi.fn(),
}))

// Mock child components
vi.mock('@/components/datasources/DataSourceSelector.vue', () => ({
  default: {
    name: 'DataSourceSelector',
    template: '<div class="data-source-selector-mock"></div>',
    props: ['modelValue', 'dataSources', 'loading'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('@/components/datasources/ReportTypeSelector.vue', () => ({
  default: {
    name: 'ReportTypeSelector',
    template: '<div class="report-type-selector-mock"></div>',
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
  },
}))

vi.mock('@/components/datasources/DashboardReport.vue', () => ({
  default: {
    name: 'DashboardReport',
    template: '<div class="dashboard-report-mock" data-testid="dashboard-report"></div>',
    props: ['data'],
  },
}))

vi.mock('@/components/datasources/DataDensityReport.vue', () => ({
  default: {
    name: 'DataDensityReport',
    template: '<div class="data-density-report-mock" data-testid="datadensity-report"></div>',
    props: ['data'],
  },
}))

vi.mock('@/components/datasources/PersonReport.vue', () => ({
  default: {
    name: 'PersonReport',
    template: '<div class="person-report-mock" data-testid="person-report"></div>',
    props: ['data'],
  },
}))

vi.mock('@/components/datasources/ObservationPeriodReport.vue', () => ({
  default: {
    name: 'ObservationPeriodReport',
    template: '<div class="observation-period-report-mock" data-testid="observation-period-report"></div>',
    props: ['data'],
  },
}))

vi.mock('@/components/datasources/DeathReport.vue', () => ({
  default: {
    name: 'DeathReport',
    template: '<div class="death-report-mock" data-testid="death-report"></div>',
    props: ['data'],
  },
}))

vi.mock('@/components/datasources/ClinicalDomainReport.vue', () => ({
  default: {
    name: 'ClinicalDomainReport',
    template: '<div class="clinical-domain-report-mock" data-testid="clinical-domain-report"></div>',
    props: ['data', 'reportType'],
  },
}))

const vuetify = createVuetify({ components, directives })

function mountComponent(props = {}, options = {}) {
  return mount(DataSourcesView, {
    props,
    global: {
      plugins: [vuetify],
    },
    ...options,
  })
}

describe('DataSourcesView', () => {
  let wrapper: VueWrapper
  let store: ReturnType<typeof useDataSourcesStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useDataSourcesStore()
    vi.clearAllMocks()
    mockRoute.params = {}
    mockListDataSources.mockResolvedValue([])
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Rendering', () => {
    it('should render the page wrapper', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.page-wrapper').exists()).toBe(true)
    })

    it('should render the page card', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.page-card').exists()).toBe(true)
    })

    it('should render the datasources view container', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.datasources-view').exists()).toBe(true)
    })

    it('should render page header with title', () => {
      wrapper = mountComponent()
      const header = wrapper.find('.datasources-view__header')
      expect(header.exists()).toBe(true)
      expect(header.text()).toContain('Data Sources')
    })

    it('should render DataSourceSelector component', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'DataSourceSelector' }).exists()).toBe(true)
    })

    it('should render ReportTypeSelector component', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'ReportTypeSelector' }).exists()).toBe(true)
    })
  })

  describe('Initialization', () => {
    it('should fetch data sources on mount', async () => {
      wrapper = mountComponent()
      await flushPromises()
      expect(mockListDataSources).toHaveBeenCalled()
    })

    it('should display loading state while fetching sources', async () => {
      let resolvePromise: (value: any) => void
      mockListDataSources.mockReturnValue(new Promise(resolve => { resolvePromise = resolve }))

      wrapper = mountComponent()
      await wrapper.vm.$nextTick()

      expect(store.loading.sources).toBe(true)

      resolvePromise!([])
      await flushPromises()

      expect(store.loading.sources).toBe(false)
    })
  })

  describe('Header Display', () => {
    it('should show source name and report type in subtitle when both selected', async () => {
      const mockSource = createMockDataSource({ sourceId: 1, sourceName: 'Test Database', sourceKey: 'TEST' })
      mockListDataSources.mockResolvedValue([mockSource])

      wrapper = mountComponent()
      await flushPromises()

      store.selectedSourceId = 1
      store.selectedReportType = 'dashboard'
      await wrapper.vm.$nextTick()

      const subtitle = wrapper.find('.text-subtitle-1')
      expect(subtitle.exists()).toBe(true)
      expect(subtitle.text()).toContain('Test Database')
      expect(subtitle.text()).toContain('Dashboard')
    })

    it('should not show subtitle when source is not selected', async () => {
      wrapper = mountComponent()
      await flushPromises()

      const subtitle = wrapper.find('.text-subtitle-1')
      expect(subtitle.exists()).toBe(false)
    })
  })

  describe('Selector Props', () => {
    it('should pass correct props to DataSourceSelector', async () => {
      const mockSources = [createMockDataSource()]
      mockListDataSources.mockResolvedValue(mockSources)

      wrapper = mountComponent()
      await flushPromises()

      const selector = wrapper.findComponent({ name: 'DataSourceSelector' })
      expect(selector.props('dataSources')).toEqual(mockSources)
    })

    it('should disable ReportTypeSelector when no source is selected', () => {
      wrapper = mountComponent()

      const selector = wrapper.findComponent({ name: 'ReportTypeSelector' })
      expect(selector.props('disabled')).toBe(true)
    })

    it('should enable ReportTypeSelector when source is selected', async () => {
      wrapper = mountComponent()

      store.selectedSourceId = 1
      await wrapper.vm.$nextTick()

      const selector = wrapper.findComponent({ name: 'ReportTypeSelector' })
      expect(selector.props('disabled')).toBe(false)
    })
  })

  describe('Error States', () => {
    it('should show source error alert when sources fail to load', async () => {
      mockListDataSources.mockRejectedValue(new Error('Failed to load'))

      wrapper = mountComponent()
      await flushPromises()

      expect(store.error.sources).toBeTruthy()
      const alerts = wrapper.findAll('.v-alert')
      expect(alerts.length).toBeGreaterThan(0)
    })

    it('should show retry button in source error alert', async () => {
      mockListDataSources.mockRejectedValue(new Error('Failed to load'))

      wrapper = mountComponent()
      await flushPromises()

      const retryButtons = wrapper.findAll('button')
      const hasRetryButton = retryButtons.some(btn => btn.text().includes('Retry'))
      expect(hasRetryButton).toBe(true)
    })
  })

  describe('Loading States', () => {
    it('should show skeleton loader when report is loading', async () => {
      const mockSource = createMockDataSource({ sourceKey: 'TEST' })
      mockListDataSources.mockResolvedValue([mockSource])

      let resolveReport: (value: any) => void
      mockGetDashboardReport.mockReturnValue(new Promise(resolve => { resolveReport = resolve }))

      wrapper = mountComponent()
      await flushPromises()

      // Use store action to select source, then trigger report fetch
      store.selectedSourceId = mockSource.sourceId
      await wrapper.vm.$nextTick()

      // Start the report fetch (don't await - we want to check loading state)
      const fetchPromise = store.selectReportType('dashboard')
      await wrapper.vm.$nextTick()
      await flushPromises()

      const hasSkeleton = wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()
      expect(hasSkeleton).toBe(true)

      resolveReport!({ summary: { sourceName: 'Test', personCount: 100 }, genderDistribution: [], ageDistribution: { categories: [], series: [] }, cumulativeObservation: { categories: [], series: [] }, observationByMonth: { categories: [], series: [] } })
      await fetchPromise
      await flushPromises()
    })
  })

  describe('Report Rendering', () => {
    it('should render DashboardReport when dashboard data is available', async () => {
      const mockSource = createMockDataSource({ sourceKey: 'TEST' })
      const mockReport: DashboardReport = {
        summary: { sourceName: 'Test', personCount: 1000 },
        genderDistribution: [],
        ageDistribution: { categories: [], series: [] },
        cumulativeObservation: { categories: [], series: [] },
        observationByMonth: { categories: [], series: [] },
      }

      mockListDataSources.mockResolvedValue([mockSource])
      mockGetDashboardReport.mockResolvedValue(mockReport)

      wrapper = mountComponent()
      await flushPromises()

      // Set source and fetch report
      store.selectedSourceId = mockSource.sourceId
      await store.selectReportType('dashboard')

      // Wait for component to update with retry logic for CI stability
      await vi.waitFor(
        async () => {
          await flushPromises()
          await wrapper.vm.$nextTick()
          const dashboardReport = wrapper.findComponent({ name: 'DashboardReport' })
          expect(dashboardReport.exists()).toBe(true)
        },
        { timeout: 5000, interval: 100 }
      )
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no sources are available', async () => {
      mockListDataSources.mockResolvedValue([])

      wrapper = mountComponent()
      await flushPromises()

      const emptyState = wrapper.find('.text-center')
      expect(emptyState.exists()).toBe(true)
      expect(emptyState.text()).toContain('No data sources available')
    })

    it('should show database icon in empty state', async () => {
      mockListDataSources.mockResolvedValue([])

      wrapper = mountComponent()
      await flushPromises()

      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
      expect(icon.props('icon')).toBe('mdi-database-off')
    })
  })

  describe('Navigation Handling', () => {
    it('should update URL when source changes', async () => {
      const mockSource = createMockDataSource({ sourceId: 1, sourceKey: 'NEW_SOURCE' })
      mockListDataSources.mockResolvedValue([mockSource])

      wrapper = mountComponent()
      await flushPromises()

      store.selectedSourceId = mockSource.sourceId
      store.selectedReportType = 'dashboard'
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleSourceChange(1)

      expect(mockPush).toHaveBeenCalledWith({
        name: 'datasources',
        params: {
          sourceKey: 'NEW_SOURCE',
          reportType: 'dashboard',
        },
      })
    })

    it('should not update URL when source change is null', async () => {
      wrapper = mountComponent()

      await wrapper.vm.handleSourceChange(null)

      expect(mockPush).not.toHaveBeenCalled()
    })

    it('should update URL when report type changes', async () => {
      const mockSource = createMockDataSource({ sourceKey: 'TEST_SOURCE' })
      mockListDataSources.mockResolvedValue([mockSource])

      wrapper = mountComponent()
      await flushPromises()

      store.selectedSourceId = mockSource.sourceId
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleReportTypeChange('person')

      expect(mockPush).toHaveBeenCalledWith({
        name: 'datasources',
        params: {
          sourceKey: 'TEST_SOURCE',
          reportType: 'person',
        },
      })
    })

    it('should not update URL when report type change is null', async () => {
      wrapper = mountComponent()

      await wrapper.vm.handleReportTypeChange(null)

      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Data Test IDs', () => {
    it('should have data-testid on DataSourceSelector', () => {
      wrapper = mountComponent()
      const selector = wrapper.find('[data-testid="datasource-selector"]')
      expect(selector.exists()).toBe(true)
    })

    it('should have data-testid on ReportTypeSelector', () => {
      wrapper = mountComponent()
      const selector = wrapper.find('[data-testid="report-type-selector"]')
      expect(selector.exists()).toBe(true)
    })
  })

  describe('Computed Properties', () => {
    it('should compute correct report type label', async () => {
      wrapper = mountComponent()

      store.selectedReportType = 'dashboard'
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.reportTypeLabel).toBe('Dashboard')
    })

    it('should return empty string for report type label when no type selected', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.reportTypeLabel).toBe('')
    })

    it('should identify clinical domain reports correctly', () => {
      wrapper = mountComponent()

      store.selectedReportType = 'visit'

      expect(wrapper.vm.isClinicalDomainReport).toBe(true)
    })

    it('should return false for non-clinical domain reports', () => {
      wrapper = mountComponent()

      store.selectedReportType = 'dashboard'

      expect(wrapper.vm.isClinicalDomainReport).toBe(false)
    })
  })

  describe('CSS Classes and Styling', () => {
    it('should apply page-wrapper class', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.page-wrapper').exists()).toBe(true)
    })

    it('should apply page-card class', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.page-card').exists()).toBe(true)
    })

    it('should apply datasources-view class to container', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.datasources-view').exists()).toBe(true)
    })

    it('should apply header class', () => {
      wrapper = mountComponent()
      expect(wrapper.find('.datasources-view__header').exists()).toBe(true)
    })
  })

  describe('Accessibility', () => {
    it('should have semantic heading for page title', () => {
      wrapper = mountComponent()
      const heading = wrapper.find('h1.text-h4')
      expect(heading.exists()).toBe(true)
      expect(heading.text()).toContain('Data Sources')
    })

    it('should use v-container for proper grid layout', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VContainer' }).exists()).toBe(true)
    })

    it('should use v-row and v-col for responsive layout', () => {
      wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VRow' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VCol' }).exists()).toBe(true)
    })
  })
})
