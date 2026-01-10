/**
 * Component Tests: CacheManagementSection
 *
 * Tests for cache management section component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CacheManagementSection from '@/components/config/CacheManagementSection.vue'
import { useConfigStore } from '@/stores/config'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

describe('CacheManagementSection.vue', () => {
  let wrapper: VueWrapper
  let configStore: ReturnType<typeof useConfigStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    configStore = useConfigStore()

    // Mock store methods
    configStore.getCacheStats = vi.fn().mockResolvedValue({ itemCount: 5, estimatedSize: 1024 })
    configStore.clearCache = vi.fn().mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Mounting and initialization', () => {
    it('should mount successfully', () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should load cache stats on mount', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(configStore.getCacheStats).toHaveBeenCalled()
    })

    it('should display cache statistics', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('5 items cached')
      expect(wrapper.text()).toContain('1 KB')
    })
  })

  describe('Cache statistics formatting', () => {
    it('should format bytes correctly for KB', async () => {
      configStore.getCacheStats = vi.fn().mockResolvedValue({ itemCount: 10, estimatedSize: 2048 })

      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('2 KB')
    })

    it('should format bytes correctly for MB', async () => {
      configStore.getCacheStats = vi.fn().mockResolvedValue({ itemCount: 100, estimatedSize: 1048576 })

      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('1 MB')
    })

    it('should handle singular item count', async () => {
      configStore.getCacheStats = vi.fn().mockResolvedValue({ itemCount: 1, estimatedSize: 512 })

      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(wrapper.text()).toContain('1 item cached')
    })
  })

  describe('Clear cache button', () => {
    it('should display clear cache button', () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      expect(clearButton).toBeDefined()
    })

    it('should open confirmation dialog when clear button clicked', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))

      await clearButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })
  })

  describe('Confirmation dialog', () => {
    it('should display confirmation message', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await clearButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Check that dialog is open
      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(true)
    })

    it('should close dialog when cancel clicked', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const clearButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await clearButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Find and click cancel button
      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const cancelButton = allButtons.find(btn => btn.text() === 'Cancel')
      await cancelButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('modelValue')).toBe(false)
    })

    it('should call clearCache and close dialog on confirm', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Find and click confirm button
      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(configStore.clearCache).toHaveBeenCalled()
    })
  })

  describe('Success and error handling', () => {
    it('should show success toast on successful cache clear', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog and confirm
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Check for success snackbar
      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('color') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(true)
    })

    it('should show error toast on cache clear failure', async () => {
      configStore.clearCache = vi.fn().mockRejectedValue(new Error('Network error'))

      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog and confirm
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Check for error snackbar
      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const errorSnackbar = snackbars.find(s => s.props('color') === 'error')
      expect(errorSnackbar?.props('modelValue')).toBe(true)
    })

    it('should reload cache stats after successful clear', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Clear the initial call
      vi.clearAllMocks()

      // Open dialog and confirm
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Should reload stats after clearing
      expect(configStore.getCacheStats).toHaveBeenCalled()
    })
  })

  describe('Loading states', () => {
    it('should disable button while clearing cache', async () => {
      // Make clearCache slow
      configStore.clearCache = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Open dialog and confirm
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Button should be in loading state
      expect(confirmButton!.props('loading')).toBe(true)
    })
  })

  describe('Toast notifications', () => {
    it('should close success toast when close button clicked', async () => {
      wrapper = mount(CacheManagementSection, {
        global: {
          plugins: [vuetify]
        }
      })

      // Trigger successful cache clear
      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const openButton = buttons.find(btn => btn.text().includes('Clear Configuration Cache'))
      await openButton!.trigger('click')
      await wrapper.vm.$nextTick()

      const allButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const confirmButton = allButtons.find(btn => {
        const text = btn.text()
        return text === 'Clear Cache' && btn.props('color') === 'warning'
      })

      await confirmButton!.trigger('click')
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 0))

      // Find close button in snackbar
      const afterButtons = wrapper.findAllComponents({ name: 'VBtn' })
      const closeButton = afterButtons.find(btn => btn.text() === 'Close')

      await closeButton!.trigger('click')
      await wrapper.vm.$nextTick()

      // Snackbar should be hidden
      const snackbars = wrapper.findAllComponents({ name: 'VSnackbar' })
      const successSnackbar = snackbars.find(s => s.props('color') === 'success')
      expect(successSnackbar?.props('modelValue')).toBe(false)
    })
  })
})
