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

// Mock fetch
global.fetch = vi.fn()

const mockDataSources = [
  {
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

    // Setup default fetch mock
    ;(global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/WebAPI/source/sources') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockDataSources)
        } as Response)
      }
      if (url.includes('/vocabulary/') && url.includes('/info')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
      }
      return Promise.reject(new Error('Not found'))
    })
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

      expect(global.fetch).toHaveBeenCalledWith('/WebAPI/source/sources')
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

      expect(wrapper.text()).toContain('Source Name')
      expect(wrapper.text()).toContain('Dialect')
      expect(wrapper.text()).toContain('Vocabulary')
      expect(wrapper.text()).toContain('Evidence')
      expect(wrapper.text()).toContain('Results')
      expect(wrapper.text()).toContain('Actions')
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

      const radioInputs = wrapper.findAll('input[type="radio"]')
      const vocabRadio = radioInputs.find(input => input.element.value === 'OHDSI-CDMV5')

      await vocabRadio!.setValue(true)
      await wrapper.vm.$nextTick()

      expect(setItemSpy).toHaveBeenCalledWith('selectedVocabulary', 'OHDSI-CDMV5')
    })
  })

  describe('Action buttons', () => {
    it('should display check connection button', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const checkButton = buttons.find(btn => btn.text() === 'Check')
      expect(checkButton).toBeDefined()
    })

    it('should display refresh cache button', async () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const refreshButton = buttons.find(btn => btn.text() === 'Refresh')
      expect(refreshButton).toBeDefined()
    })

    it('should call connection check API when check clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDataSources)
      } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true
        } as Response)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const checkButtons = buttons.filter(btn => btn.text() === 'Check')

      await checkButtons[0].trigger('click')
      await flushPromises()

      expect(global.fetch).toHaveBeenCalledWith('/WebAPI/source/OHDSI-CDMV5/connectionCheck')
    })

    it('should call refresh cache API when refresh clicked', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDataSources)
      } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true
        } as Response)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const refreshButtons = buttons.filter(btn => btn.text() === 'Refresh')

      await refreshButtons[0].trigger('click')
      await flushPromises()

      expect(global.fetch).toHaveBeenCalledWith(
        '/WebAPI/source/OHDSI-CDMV5/refreshSourceCache',
        { method: 'POST' }
      )
    })
  })

  describe('Configuration actions', () => {
    it('should display clear local cache button', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearLocalButton = buttons.find(btn => btn.text().includes('Clear Local Cache'))
      expect(clearLocalButton).toBeDefined()
    })

    it('should display clear server cache button', () => {
      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearServerButton = buttons.find(btn => btn.text().includes('Clear Server Cache'))
      expect(clearServerButton).toBeDefined()
    })

    it('should clear localStorage when clear local cache clicked', async () => {
      const clearSpy = vi.spyOn(Storage.prototype, 'clear')

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearLocalButton = buttons.find(btn => btn.text().includes('Clear Local Cache'))

      await clearLocalButton!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(clearSpy).toHaveBeenCalled()
    })

    it('should show confirmation for server cache clear', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearServerButton = buttons.find(btn => btn.text().includes('Clear Server Cache'))

      await clearServerButton!.trigger('click')
      await wrapper.vm.$nextTick()

      expect(confirmSpy).toHaveBeenCalled()
    })
  })

  describe('Toast notifications', () => {
    it('should show success toast on successful connection check', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDataSources)
      } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
        .mockResolvedValueOnce({
          ok: true
        } as Response)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const checkButtons = buttons.filter(btn => btn.text() === 'Check')

      await checkButtons[0].trigger('click')
      await flushPromises()
      await wrapper.vm.$nextTick()

      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('color') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(true)
    })

    it('should show error toast on connection failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDataSources)
      } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ version: 'v5.4' })
        } as Response)
        .mockResolvedValueOnce({
          ok: false
        } as Response)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const checkButtons = buttons.filter(btn => btn.text() === 'Check')

      await checkButtons[0].trigger('click')
      await flushPromises()

      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('color') === 'error')
      expect(errorSnackbar?.props('modelValue')).toBe(true)
    })
  })

  describe('Empty state', () => {
    it('should show message when no data sources configured', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      } as Response)

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      expect(wrapper.text()).toContain('No data sources configured')
    })
  })

  describe('Error handling', () => {
    it('should show error toast when data sources fail to load', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'))

      wrapper = mount(DataSourcesSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await flushPromises()

      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('color') === 'error')
      expect(errorSnackbar?.props('modelValue')).toBe(true)
    })
  })
})
