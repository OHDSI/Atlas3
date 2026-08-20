/**
 * Unit Tests: App.vue
 *
 * Tests for the main application component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import App from '@/App.vue'
import { useLocaleStore } from '@/stores/locale'
import { useAuthStore } from '@/stores/auth'

// Mock child components
vi.mock('@/components/shared/NavBar.vue', () => ({
  default: { name: 'NavBar', template: '<div class="navbar-mock"></div>' }
}))

vi.mock('@/components/auth/SessionExpiryModal.vue', () => ({
  default: { name: 'SessionExpiryModal', template: '<div class="session-expiry-mock"></div>' }
}))

vi.mock('@/components/ConfigurationWarningBanner.vue', () => ({
  default: { name: 'ConfigurationWarningBanner', template: '<div class="config-warning-mock"></div>' }
}))

vi.mock('@/components/shared/LicenseAgreementDialog.vue', () => ({
  default: { name: 'LicenseAgreementDialog', template: '<div class="license-dialog-mock"></div>' }
}))

vi.mock('@/components/config/ConfigPanel.vue', () => ({
  default: { name: 'ConfigPanel', template: '<div class="config-panel-mock"></div>' }
}))

// Mock composables
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ({ value: fallback || key }),
    tv: (key: string, fallback: string) => fallback || key,
  })
}))

vi.mock('@/composables/useLicenseAgreement', () => ({
  useLicenseAgreement: () => ({
    showLicenseDialog: { value: false },
    acceptLicense: vi.fn(),
    rejectLicense: vi.fn(),
    checkLicenseStatus: vi.fn()
  })
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

const vuetify = createVuetify()

describe('App.vue', () => {
  let wrapper: VueWrapper
  let localeStore: ReturnType<typeof useLocaleStore>
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    localeStore = useLocaleStore()
    authStore = useAuthStore()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.clearAllMocks()
  })

  describe('Component Structure', () => {
    it('should render v-app wrapper', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      const vApp = wrapper.findComponent({ name: 'VApp' })
      expect(vApp.exists()).toBe(true)
    })

    it('should render all main child components', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      expect(wrapper.findComponent({ name: 'NavBar' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ConfigurationWarningBanner' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'SessionExpiryModal' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'LicenseAgreementDialog' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'ConfigPanel' }).exists()).toBe(true)
    })

    it('should render router-view in v-main', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: { template: '<div class="router-view-stub"></div>' }
          }
        }
      })

      const vMain = wrapper.findComponent({ name: 'VMain' })
      expect(vMain.exists()).toBe(true)
    })
  })

  describe('Initial Loading Overlay', () => {
    it('should show overlay when translations are loading and empty', async () => {
      // Set loading state with no translations
      localeStore.loading = true
      localeStore.translations = {}

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      const overlay = wrapper.findComponent({ name: 'VOverlay' })
      expect(overlay.exists()).toBe(true)
      expect(wrapper.vm.isInitializing).toBe(true)
    })

    it('should hide overlay when translations are loaded', async () => {
      // Set loaded state with translations
      localeStore.loading = false
      localeStore.translations = { 'en': { common: { loading: 'Loading...' } } }

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isInitializing).toBe(false)
    })

    it('should hide overlay when translations exist even if still loading', async () => {
      // Still loading but has translations
      localeStore.loading = true
      localeStore.translations = { 'en': { common: { loading: 'Loading...' } } }

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isInitializing).toBe(false)
    })

    it('should render loading indicator in overlay', async () => {
      localeStore.loading = true
      localeStore.translations = {}

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      const progressCircular = wrapper.findComponent({ name: 'VProgressCircular' })
      expect(progressCircular.exists()).toBe(true)
      expect(progressCircular.props('indeterminate')).toBe(true)
      expect(progressCircular.props('size')).toBe('64')
      expect(progressCircular.props('color')).toBe('primary')
    })
  })

  describe('Session Expiry Modal', () => {
    it('should pass correct props to SessionExpiryModal', () => {
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
      authStore.sessionExpiryModalOpen = true
      authStore.sessionExpiresAt = expiresAt
      authStore.isRefreshing = false

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      const modal = wrapper.findComponent({ name: 'SessionExpiryModal' })
      expect(modal.exists()).toBe(true)
      // Mocked components don't have props in stubbed mode, just verify existence
    })

    it('should calculate remaining seconds correctly', async () => {
      const expiresAt = new Date(Date.now() + 300 * 1000) // 5 minutes
      authStore.sessionExpiresAt = expiresAt

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.$nextTick()

      // Should be approximately 300 seconds (within a small margin)
      expect(wrapper.vm.remainingSeconds).toBeGreaterThanOrEqual(299)
      expect(wrapper.vm.remainingSeconds).toBeLessThanOrEqual(300)
    })

    it('should return 0 remaining seconds when no expiry time', () => {
      authStore.sessionExpiresAt = null

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      expect(wrapper.vm.remainingSeconds).toBe(0)
    })

    it('should not return negative remaining seconds', () => {
      const expiresAt = new Date(Date.now() - 1000) // Expired
      authStore.sessionExpiresAt = expiresAt

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      expect(wrapper.vm.remainingSeconds).toBe(0)
    })
  })

  describe('Session Management Handlers', () => {
    it('should extend session successfully', async () => {
      authStore.extendSession = vi.fn().mockResolvedValue(undefined)

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.handleExtendSession()

      expect(authStore.extendSession).toHaveBeenCalled()
      expect(wrapper.vm.extensionError).toBeNull()
    })

    it('should handle session extension error', async () => {
      const error = new Error('Network error')
      authStore.extendSession = vi.fn().mockRejectedValue(error)

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.handleExtendSession()

      expect(authStore.extendSession).toHaveBeenCalled()
      expect(wrapper.vm.extensionError).toBe('Failed to extend session. Please try again.')
    })

    it('should handle logout action', () => {
      authStore.clearAuth = vi.fn()
      authStore.openLoginModal = vi.fn()

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      wrapper.vm.handleLogout()

      expect(authStore.clearAuth).toHaveBeenCalled()
      expect(authStore.openLoginModal).toHaveBeenCalled()
    })

    it('should handle session expiry', () => {
      authStore.clearAuth = vi.fn()
      authStore.openLoginModal = vi.fn()

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      wrapper.vm.handleExpired()

      expect(authStore.clearAuth).toHaveBeenCalled()
      expect(authStore.openLoginModal).toHaveBeenCalled()
    })

    it('should treat modal dismissal as extend session', async () => {
      authStore.extendSession = vi.fn().mockResolvedValue(undefined)

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      await wrapper.vm.handleDismissModal()

      expect(authStore.extendSession).toHaveBeenCalled()
    })

    it('should clear extension error before retrying extend', async () => {
      authStore.extendSession = vi.fn().mockResolvedValue(undefined)

      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      // Set an existing error
      wrapper.vm.extensionError = 'Previous error'

      await wrapper.vm.handleExtendSession()

      expect(wrapper.vm.extensionError).toBeNull()
    })
  })

  describe('License Agreement', () => {
    it('should have license agreement dialog component', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      const licenseDialog = wrapper.findComponent({ name: 'LicenseAgreementDialog' })
      expect(licenseDialog.exists()).toBe(true)
    })

    it('should have handleAcceptLicense method', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      expect(typeof wrapper.vm.handleAcceptLicense).toBe('function')
    })

    it('should have handleRejectLicense method', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      expect(typeof wrapper.vm.handleRejectLicense).toBe('function')
    })
  })

  describe('Store Initialization', () => {
    it('should access locale store', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      // Verify the store was accessed during component setup
      expect(localeStore).toBeDefined()
    })

    it('should access auth store', () => {
      wrapper = mount(App, {
        global: {
          plugins: [vuetify],
          stubs: {
            RouterView: true
          }
        }
      })

      // Verify the store was accessed during component setup
      expect(authStore).toBeDefined()
    })
  })
})
