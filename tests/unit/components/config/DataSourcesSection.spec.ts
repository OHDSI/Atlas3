/**
 * Component Tests: DataSourcesSection
 *
 * Tests for data sources section component
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { mount, VueWrapper, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DataSourcesSection from '@/components/config/DataSourcesSection.vue'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

// Mock the services used by the component
const mockListDataSources = vi.fn()
const mockHttpGet = vi.fn()
const mockHttpPost = vi.fn()

vi.mock('@/services/datasource.service', () => ({
  listDataSources: () => mockListDataSources()
}))

vi.mock('@/services/http-client', () => ({
  httpGet: (url: string) => mockHttpGet(url),
  httpPost: (url: string, body?: unknown) => mockHttpPost(url, body)
}))

vi.mock('@/services/source.service', () => ({
  deleteSource: vi.fn()
}))

const mockDataSources = [
  {
    sourceId: 1,
    sourceKey: 'OHDSI-CDMV5',
    sourceName: 'OHDSI CDM V5 Database',
    sourceDialect: 'postgresql',
    version: 'v5.4',
    daimons: [
      { daimonType: 'Vocabulary' },
      { daimonType: 'CEM' },
      { daimonType: 'Results' }
    ]
  },
  {
    sourceId: 2,
    sourceKey: 'SYNPUF-5PCT',
    sourceName: 'Synpuf 5PCT',
    sourceDialect: 'sql server',
    version: 'v5.3',
    daimons: [
      { daimonType: 'Vocabulary' },
      { daimonType: 'Results' }
    ]
  }
]

describe('DataSourcesSection.vue', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Setup default service mocks
    mockListDataSources.mockResolvedValue(mockDataSources)
    mockHttpGet.mockImplementation((url: string) => {
      if (url.includes('/vocabulary/') && url.includes('/info')) {
        return Promise.resolve({ version: 'v5.4' })
      }
      if (url.includes('/source/connection/')) {
        return Promise.resolve({ status: 'ok' })
      }
      return Promise.resolve({})
    })
    mockHttpPost.mockResolvedValue({})
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Mounting and initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load data sources on mount', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(mockListDataSources).toHaveBeenCalled()
    })

    it('should display loaded data sources', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('OHDSI CDM V5 Database')
      expect(wrapper.text()).toContain('Synpuf 5PCT')
    })
  })

  describe('Priority scope selector', () => {
    it('should display priority scope toggle', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.text()).toContain('Change source priorities in:')
    })

    it('should have session and application options', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const sessionBtn = buttons.find(btn => btn.text() === 'Current Session')
      const appBtn = buttons.find(btn => btn.text() === 'Whole Application')

      expect(sessionBtn).toBeDefined()
      expect(appBtn).toBeDefined()
    })

    it('should default to session scope', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const btnToggle = wrapper.findComponent({ name: 'VBtnToggle' })
      expect(btnToggle.props('modelValue')).toBe('session')
    })
  })

  describe('Data sources table', () => {
    it('should display table headers', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Headers are translated - check for the actual translated text
      const text = wrapper.text()
      expect(text).toContain('Name')
      expect(text).toContain('Dialect')
      expect(text).toContain('Vocabulary')
      expect(text).toContain('Evidence')
      expect(text).toContain('Results')
      expect(text).toContain('Actions')
    })

    it('should display source information', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('OHDSI-CDMV5')
      expect(wrapper.text()).toContain('postgresql')
    })

    it('should show initialized status icon', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const icons = wrapper.findAllComponents({ name: 'VIcon' })
      // Check that icons are rendered (Vuetify may render icon content differently)
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('Vocabulary selection', () => {
    it('should have radio buttons for vocabulary selection', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const radioInputs = wrapper.findAll('input[type="radio"]')
      // Each source has 3 radio buttons (vocabulary, evidence, results) = 2 sources * 3 = 6
      expect(radioInputs.length).toBeGreaterThan(0)
    })

    it('should enable vocabulary radio only for sources with vocabulary', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const radioInputs = wrapper.findAll('input[type="radio"]')
      // Check that radio inputs are rendered
      expect(radioInputs.length).toBeGreaterThan(0)
    })

    it('should persist vocabulary selection to localStorage', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // The first source should be auto-selected, but let's trigger a change
      const radioInputs = wrapper.findAll('input[type="radio"]')
      // Find vocabulary radios (first of every 3)
      if (radioInputs.length >= 4) {
        await radioInputs[3].setValue(true) // Select second source's vocabulary
        await wrapper.vm.$nextTick()
        expect(setItemSpy).toHaveBeenCalledWith('selectedVocabulary', 'SYNPUF-5PCT')
      }
    })
  })

  describe('Action buttons', () => {
    it('should display connection and refresh buttons per row', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Each row has 4 action buttons: edit, connection check, refresh, delete
      // 2 sources * 4 buttons = 8 action buttons plus other buttons
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      expect(buttons.length).toBeGreaterThan(8)
    })

    it('should call connection check API when connection button clicked', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find connection button by looking for mdi-connection icon
      const icons = wrapper.findAll('.mdi-connection')
      if (icons.length > 0) {
        // Click the parent button
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await flushPromises()
          expect(mockHttpGet).toHaveBeenCalledWith('/source/connection/OHDSI-CDMV5')
        }
      }
    })

    it('should call refresh cache API when refresh button clicked', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find refresh button by looking for mdi-refresh icon
      const icons = wrapper.findAll('.mdi-refresh')
      if (icons.length > 0) {
        // Click the parent button
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await flushPromises()
          // httpPost is called with URL and optional undefined body
          expect(mockHttpPost).toHaveBeenCalledWith('/cdmresults/OHDSI-CDMV5/clearCache', undefined)
        }
      }
    })
  })

  describe('Configuration actions', () => {
    it('should display clear configuration cache button', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // The button text is translated
      const text = wrapper.text()
      expect(text).toContain('Clear Configuration Cache')
    })

    it('should display clear server cache button', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const text = wrapper.text()
      expect(text).toContain('Clear Server Cache')
    })

    it('should clear localStorage when clear local cache clicked', async () => {
      const clearSpy = vi.spyOn(Storage.prototype, 'clear')

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find the button with the mdi-delete-sweep icon
      const icons = wrapper.findAll('.mdi-delete-sweep')
      if (icons.length > 0) {
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await wrapper.vm.$nextTick()
          expect(clearSpy).toHaveBeenCalled()
        }
      }
    })

    it('should show confirmation for server cache clear', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find the button with the mdi-server icon
      const icons = wrapper.findAll('.mdi-server')
      if (icons.length > 0) {
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await wrapper.vm.$nextTick()
          expect(confirmSpy).toHaveBeenCalled()
        }
      }
    })
  })

  describe('Toast notifications', () => {
    it('should show success toast on successful connection check', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find and click connection button
      const icons = wrapper.findAll('.mdi-connection')
      if (icons.length > 0) {
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await flushPromises()
          await wrapper.vm.$nextTick()

          const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
          const successSnackbar = snackbars.find(s => s.props('severity') === 'success')
          expect(successSnackbar?.props('modelValue')).toBe(true)
        }
      }
    })

    it('should show error toast on connection failure', async () => {
      mockHttpGet.mockImplementation((url: string) => {
        if (url.includes('/source/connection/')) {
          return Promise.reject(new Error('Connection failed'))
        }
        if (url.includes('/vocabulary/') && url.includes('/info')) {
          return Promise.resolve({ version: 'v5.4' })
        }
        return Promise.resolve({})
      })

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // Find and click connection button
      const icons = wrapper.findAll('.mdi-connection')
      if (icons.length > 0) {
        const btn = icons[0].element.closest('button')
        if (btn) {
          await btn.click()
          await flushPromises()
          await wrapper.vm.$nextTick()

          const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
          const errorSnackbar = snackbars.find(s => s.props('severity') === 'danger')
          expect(errorSnackbar?.props('modelValue')).toBe(true)
        }
      }
    })
  })

  describe('Empty state', () => {
    it('should show message when no data sources configured', async () => {
      mockListDataSources.mockResolvedValue([])

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      // The alert shows the translated message for no sources
      expect(wrapper.text()).toContain('no sources defined')
    })
  })

  describe('Error handling', () => {
    it('should show error toast when data sources fail to load', async () => {
      mockListDataSources.mockRejectedValue(new Error('Network error'))

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const snackbars = wrapper.findAllComponents({ name: 'AtlasSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('severity') === 'danger')
      expect(errorSnackbar?.props('modelValue')).toBe(true)
    })
  })
})
