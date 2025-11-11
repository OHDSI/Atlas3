import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import type { PersonReport as PersonReportType } from '@/models/report.types'

// Mock the composables
const mockLoadReport = vi.fn()
const mockCurrentReportData = ref<PersonReportType | null>(null)
const mockIsLoading = ref(false)
const mockHasError = ref(false)
const mockErrorMessage = ref<string | null>(null)

vi.mock('@/composables/useReports', () => ({
  useReports: () => ({
    loadReport: mockLoadReport,
    currentReportData: mockCurrentReportData,
    isLoading: mockIsLoading,
    hasError: mockHasError,
    errorMessage: mockErrorMessage
  })
}))

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import PersonReport from '@/components/reports/report-types/PersonReport.vue'
import BarChart from '@/components/reports/charts/BarChart.vue'
import PieChart from '@/components/reports/charts/PieChart.vue'

const vuetify = createVuetify({
  components,
  directives
})

describe('PersonReport.vue', () => {
  let wrapper: VueWrapper<any>

  const mockPersonData: PersonReportType = {
    yearOfBirth: [
      { year: 1990, count: 50 },
      { year: 1991, count: 75 },
      { year: 1992, count: 100 }
    ],
    demographics: {
      gender: [
        { conceptId: 8507, conceptName: 'MALE', count: 120, percentage: 53.33 },
        { conceptId: 8532, conceptName: 'FEMALE', count: 105, percentage: 46.67 }
      ],
      race: [
        { conceptId: 8527, conceptName: 'White', count: 180, percentage: 80 },
        { conceptId: 8516, conceptName: 'Black or African American', count: 45, percentage: 20 }
      ],
      ethnicity: [
        { conceptId: 38003563, conceptName: 'Not Hispanic or Latino', count: 200, percentage: 88.89 },
        { conceptId: 38003564, conceptName: 'Hispanic or Latino', count: 25, percentage: 11.11 }
      ]
    }
  }

  const createWrapper = (props = {}) => {
    return mount(PersonReport, {
      props: {
        cohortId: 123,
        sourceKey: 'SYNPUF5',
        ...props
      },
      global: {
        plugins: [createPinia(), vuetify]
      }
    })
  }

  beforeEach(() => {
    setActivePinia(createPinia())
    mockLoadReport.mockClear()
    mockCurrentReportData.value = null
    mockIsLoading.value = false
    mockHasError.value = false
    mockErrorMessage.value = null
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting', () => {
    it('should render without errors', () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper()
      expect(wrapper.exists()).toBe(true)
    })

    it('should have person-report class', () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper()
      expect(wrapper.classes()).toContain('person-report')
    })

    it('should call loadReport on mount with correct parameters', async () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper({ cohortId: 456, sourceKey: 'SYNPUF1K' })
      await flushPromises()

      expect(mockLoadReport).toHaveBeenCalledWith(456, 'SYNPUF1K', 'person')
    })
  })

  describe('Loading States', () => {
    it('should display skeleton loaders when sections are loading', async () => {
      mockLoadReport.mockImplementation(() => new Promise(() => {}))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('should show skeleton for year of birth section when loading', async () => {
      mockLoadReport.mockImplementation(() => new Promise(() => {}))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const yearOfBirthCard = wrapper.findAll('.v-card').at(0)
      expect(yearOfBirthCard?.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
    })

    it('should show skeleton for gender section when loading', async () => {
      mockLoadReport.mockImplementation(() => new Promise(() => {}))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
      expect(skeletons.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Data Display', () => {
    beforeEach(async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = mockPersonData
      })
    })

    it('should display BarChart for year of birth when data is available', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const barChart = wrapper.findComponent(BarChart)
      expect(barChart.exists()).toBe(true)
    })

    it('should display three PieCharts for demographics when data is available', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const pieCharts = wrapper.findAllComponents(PieChart)
      expect(pieCharts.length).toBe(3)
    })

    it('should pass correct data to year of birth chart', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const barChart = wrapper.findComponent(BarChart)
      expect(barChart.props('data')).toBeDefined()
      expect(barChart.props('data')?.categories).toEqual(['1990', '1991', '1992'])
      expect(barChart.props('data')?.values).toEqual([50, 75, 100])
    })

    it('should pass correct data to gender pie chart', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const pieCharts = wrapper.findAllComponents(PieChart)
      const genderChart = pieCharts[0]

      expect(genderChart.props('data')).toEqual([
        { name: 'MALE', value: 120 },
        { name: 'FEMALE', value: 105 }
      ])
    })

    it('should pass correct data to race pie chart', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const pieCharts = wrapper.findAllComponents(PieChart)
      const raceChart = pieCharts[1]

      expect(raceChart.props('data')).toEqual([
        { name: 'White', value: 180 },
        { name: 'Black or African American', value: 45 }
      ])
    })

    it('should pass correct data to ethnicity pie chart', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const pieCharts = wrapper.findAllComponents(PieChart)
      const ethnicityChart = pieCharts[2]

      expect(ethnicityChart.props('data')).toEqual([
        { name: 'Not Hispanic or Latino', value: 200 },
        { name: 'Hispanic or Latino', value: 25 }
      ])
    })
  })

  describe('Empty Data States', () => {
    it('should show info alert when no year of birth data', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: [],
          demographics: { gender: [], race: [], ethnicity: [] }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const infoAlerts = alerts.filter(a => a.props('type') === 'info')
      expect(infoAlerts.length).toBeGreaterThan(0)
    })

    it('should show "No data" for empty gender data', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: mockPersonData.yearOfBirth,
          demographics: {
            gender: [],
            race: mockPersonData.demographics.race,
            ethnicity: mockPersonData.demographics.ethnicity
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('No data')
    })

    it('should show "No data" for empty race data', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: mockPersonData.yearOfBirth,
          demographics: {
            gender: mockPersonData.demographics.gender,
            race: [],
            ethnicity: mockPersonData.demographics.ethnicity
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const infoAlerts = alerts.filter(a => a.props('type') === 'info' && a.props('density') === 'compact')
      expect(infoAlerts.length).toBeGreaterThan(0)
    })

    it('should show "No data" for empty ethnicity data', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: mockPersonData.yearOfBirth,
          demographics: {
            gender: mockPersonData.demographics.gender,
            race: mockPersonData.demographics.race,
            ethnicity: []
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const infoAlerts = alerts.filter(a => a.props('type') === 'info' && a.props('density') === 'compact')
      expect(infoAlerts.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should display error alert when year of birth section fails', async () => {
      mockLoadReport.mockRejectedValue(new Error('Network error'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const errorAlerts = wrapper.findAllComponents({ name: 'VAlert' }).filter(a => a.props('type') === 'error')
      expect(errorAlerts.length).toBeGreaterThan(0)
    })

    it('should show retry button for year of birth section error', async () => {
      mockLoadReport.mockRejectedValue(new Error('Failed to fetch'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const retryButton = buttons.find(btn => btn.text().includes('Retry'))
      expect(retryButton).toBeDefined()
    })

    it('should call retrySections when retry button is clicked', async () => {
      mockLoadReport.mockRejectedValueOnce(new Error('Error'))
        .mockImplementation(async () => {
          mockCurrentReportData.value = mockPersonData
        })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      mockLoadReport.mockClear()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const retryButton = buttons.find(btn => btn.text().includes('Retry'))
      await retryButton?.trigger('click')
      await flushPromises()

      expect(mockLoadReport).toHaveBeenCalled()
    })

    it('should clear errors when retrySections is called', async () => {
      mockLoadReport.mockRejectedValueOnce(new Error('Error'))
        .mockImplementation(async () => {
          mockCurrentReportData.value = mockPersonData
        })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionsErrors.size).toBe(4)

      await wrapper.vm.retrySections()
      await flushPromises()

      expect(wrapper.vm.sectionsErrors.size).toBe(0)
    })

    it('should show "Failed to load" for gender section error', async () => {
      mockLoadReport.mockRejectedValue(new Error('API Error'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Failed to load')
    })

    it('should show "Failed to load" for race section error', async () => {
      mockLoadReport.mockRejectedValue(new Error('Timeout'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Failed to load')
    })

    it('should show "Failed to load" for ethnicity section error', async () => {
      mockLoadReport.mockRejectedValue(new Error('Server error'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Failed to load')
    })
  })

  describe('Computed Properties', () => {
    beforeEach(async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = mockPersonData
      })
    })

    it('should compute yearOfBirthData correctly', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const computed = wrapper.vm.yearOfBirthData

      expect(computed).toBeDefined()
      expect(computed?.categories).toHaveLength(3)
      expect(computed?.values).toHaveLength(3)
      expect(computed?.unit).toBe('People')
    })

    it('should compute genderData correctly', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const computed = wrapper.vm.genderData

      expect(computed).toHaveLength(2)
      expect(computed?.[0]).toEqual({ name: 'MALE', value: 120 })
      expect(computed?.[1]).toEqual({ name: 'FEMALE', value: 105 })
    })

    it('should compute raceData correctly', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const computed = wrapper.vm.raceData

      expect(computed).toHaveLength(2)
      expect(computed?.[0].name).toBe('White')
      expect(computed?.[1].name).toBe('Black or African American')
    })

    it('should compute ethnicityData correctly', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const computed = wrapper.vm.ethnicityData

      expect(computed).toHaveLength(2)
      expect(computed?.[0].name).toBe('Not Hispanic or Latino')
      expect(computed?.[1].name).toBe('Hispanic or Latino')
    })

    it('should return null for yearOfBirthData when data is empty', async () => {
      mockLoadReport.mockClear()
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: [],
          demographics: { gender: [], race: [], ethnicity: [] }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.yearOfBirthData).toBeNull()
    })

    it('should return null for genderData when data is empty', async () => {
      mockLoadReport.mockClear()
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = {
          yearOfBirth: mockPersonData.yearOfBirth,
          demographics: {
            gender: [],
            race: [],
            ethnicity: []
          }
        }
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.genderData).toBeNull()
    })
  })

  describe('Section State Functions', () => {
    it('should correctly identify loading sections', async () => {
      mockLoadReport.mockImplementation(() => new Promise(() => {}))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionLoading('yearOfBirth')).toBe(true)
      expect(wrapper.vm.sectionLoading('gender')).toBe(true)
    })

    it('should correctly retrieve section errors', async () => {
      mockLoadReport.mockRejectedValue(new Error('Test error'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionError('gender')).toContain('Test error')
      expect(wrapper.vm.sectionError('yearOfBirth')).toContain('Test error')
    })

    it('should handle multiple sections loading simultaneously', async () => {
      mockLoadReport.mockImplementation(() => new Promise(() => {}))

      wrapper = createWrapper()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionLoading('yearOfBirth')).toBe(true)
      expect(wrapper.vm.sectionLoading('gender')).toBe(true)
      expect(wrapper.vm.sectionLoading('race')).toBe(true)
      expect(wrapper.vm.sectionLoading('ethnicity')).toBe(true)
    })
  })

  describe('Data Fetching', () => {
    it('should set all sections to loading during fetch', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = mockPersonData
      })

      wrapper = createWrapper()
      // Check loading state immediately after mount, before flushPromises
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionsLoading.size).toBe(4)

      // Now let promises resolve
      await flushPromises()

      expect(wrapper.vm.sectionsLoading.size).toBe(0)
    })

    it('should set errors on all sections if fetch fails', async () => {
      mockLoadReport.mockRejectedValue(new Error('Network failure'))

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionsErrors.size).toBe(4)
      expect(wrapper.vm.sectionsErrors.get('yearOfBirth')).toContain('Network failure')
    })

    it('should clear loading states after successful fetch', async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = mockPersonData
      })

      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.sectionsLoading.size).toBe(0)
    })
  })

  describe('UI Structure', () => {
    beforeEach(async () => {
      mockLoadReport.mockImplementation(async () => {
        mockCurrentReportData.value = mockPersonData
      })
    })

    it('should render Year of Birth Distribution card', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Year of Birth')
    })

    it('should render Demographics card', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Demographics')
    })

    it('should render three demographic subcards (Gender, Race, Ethnicity)', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const text = wrapper.text()
      expect(text).toContain('Gender')
      expect(text).toContain('Race')
      expect(text).toContain('Ethnicity')
    })

    it('should use v-row and v-col for demographics layout', async () => {
      wrapper = createWrapper()
      await flushPromises()
      await wrapper.vm.$nextTick()

      const row = wrapper.findComponent({ name: 'VRow' })
      const cols = wrapper.findAllComponents({ name: 'VCol' })

      expect(row.exists()).toBe(true)
      expect(cols.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Props Handling', () => {
    it('should accept and use cohortId prop', () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper({ cohortId: 999 })
      expect(wrapper.props('cohortId')).toBe(999)
    })

    it('should accept and use sourceKey prop', () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper({ sourceKey: 'TEST_SOURCE' })
      expect(wrapper.props('sourceKey')).toBe('TEST_SOURCE')
    })

    it('should pass props to loadReport call', async () => {
      mockLoadReport.mockResolvedValue(undefined)
      wrapper = createWrapper({ cohortId: 789, sourceKey: 'SYNPUF2K' })
      await flushPromises()

      expect(mockLoadReport).toHaveBeenCalledWith(789, 'SYNPUF2K', 'person')
    })
  })
})
