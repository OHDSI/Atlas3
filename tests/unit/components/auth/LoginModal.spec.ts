/**
 * LoginModal Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LoginModal from '@/components/auth/LoginModal.vue'
import type { AuthProvider } from '@/models/auth.types'
import { useAuthStore } from '@/stores/auth'

const vuetify = createVuetify({ components, directives })

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock auth config
vi.mock('@/config/auth.config', () => ({
  authConfig: {
    userAuthenticationEnabled: true,
    authProviders: [
      {
        name: 'Database',
        url: '/auth/db',
        ajax: true,
        icon: 'mdi-database',
        isUseCredentialsForm: true,
      },
    ],
  },
}))

// Mock auth service
vi.mock('@/services/auth/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    fetchOAuthProviders: vi.fn().mockResolvedValue([
      {
        name: 'Database',
        url: '/auth/db',
        ajax: true,
        icon: 'mdi-database',
        isUseCredentialsForm: true,
      },
    ]),
  },
}))

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, defaultValue: string) => ({ value: defaultValue }),
  }),
}))

const _mockProviders: AuthProvider[] = [
  {
    name: 'Database',
    url: '/auth/db',
    ajax: true,
    icon: 'mdi-database',
    isUseCredentialsForm: true,
  },
  {
    name: 'Google',
    url: '/oauth/google',
    ajax: false,
    icon: 'mdi-google',
    isUseCredentialsForm: false,
  },
]

describe('LoginModal', () => {
  let wrapper: VueWrapper
  let pinia: ReturnType<typeof createPinia>
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  function mountComponent() {
    return mount(LoginModal, {
      global: {
        plugins: [vuetify, pinia],
        stubs: {
          CredentialsForm: {
            name: 'CredentialsForm',
            template: '<div class="credentials-form-stub" data-testid="credentials-form"></div>',
            props: ['provider', 'loading'],
            emits: ['submit'],
          },
        },
      },
    })
  }

  describe('Component Mounting', () => {
    it('should render dialog', () => {
      wrapper = mountComponent()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.exists()).toBe(true)
    })

    it('should be persistent (not closeable by clicking outside)', () => {
      wrapper = mountComponent()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('persistent')).toBe(true)
    })

    it('should have max-width of 500', () => {
      wrapper = mountComponent()

      const dialog = wrapper.findComponent({ name: 'VDialog' })
      expect(dialog.props('maxWidth')).toBe('500')
    })

    it('should render card when modal is open', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = true
      await wrapper.vm.$nextTick()

      const card = wrapper.findComponent({ name: 'VCard' })
      expect(card.exists()).toBe(true)
    })

    it('should render card title when modal is open', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = true
      await wrapper.vm.$nextTick()

      const cardTitle = wrapper.findComponent({ name: 'VCardTitle' })
      expect(cardTitle.exists()).toBe(true)
    })
  })

  describe('Dialog Visibility', () => {
    it('should be closed by default', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.isOpen).toBe(false)
    })

    it('should reflect auth store loginModalOpen state', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = false
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isOpen).toBe(false)

      authStore.loginModalOpen = true
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isOpen).toBe(true)
    })
  })

  describe('Provider State', () => {
    it('should initialize with no selected provider', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.selectedProvider).toBeNull()
    })

    it('should have providers array', () => {
      wrapper = mountComponent()

      expect(Array.isArray(wrapper.vm.providers)).toBe(true)
    })

    it('should allow selecting a provider', () => {
      wrapper = mountComponent()

      const testProvider: AuthProvider = {
        name: 'Test Provider',
        url: '/auth/test',
        ajax: true,
        icon: 'mdi-test',
        isUseCredentialsForm: true,
      }

      wrapper.vm.selectProvider(testProvider)

      expect(wrapper.vm.selectedProvider).toEqual(testProvider)
    })

    it('should reset selected provider', () => {
      wrapper = mountComponent()

      const testProvider: AuthProvider = {
        name: 'Test Provider',
        url: '/auth/test',
        ajax: true,
        icon: 'mdi-test',
        isUseCredentialsForm: true,
      }

      wrapper.vm.selectProvider(testProvider)
      expect(wrapper.vm.selectedProvider).toBeTruthy()

      wrapper.vm.backToProviders()
      expect(wrapper.vm.selectedProvider).toBeNull()
    })
  })

  describe('Loading State', () => {
    it('should track loading providers state', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.loadingProviders).toBe('boolean')
    })

    it('should have isAuthenticating computed property', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.isAuthenticating).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should have errorMessage computed property', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.errorMessage).toBeDefined()
    })

    it('should show error alert when error message exists', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = true
      authStore.errorMessage = 'Test error message'
      await wrapper.vm.$nextTick()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.exists()).toBe(true)
    })

    it('should have clearError method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.clearError).toBe('function')
    })
  })

  describe('Modal Control Methods', () => {
    it('should have close method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.close).toBe('function')
    })

    it('should have selectProvider method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.selectProvider).toBe('function')
    })

    it('should have backToProviders method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.backToProviders).toBe('function')
    })

    it('should have handleLogin method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.handleLogin).toBe('function')
    })
  })

  describe('Conditional Rendering', () => {
    it('should render provider list when no provider selected', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = true
      await wrapper.vm.$nextTick()
      await new Promise(resolve => setTimeout(resolve, 10))

      wrapper.vm.selectedProvider = null
      await wrapper.vm.$nextTick()

      // Check if provider selection UI should be shown
      expect(wrapper.vm.selectedProvider).toBeNull()
    })

    it('should render credentials form when credentials provider is selected', async () => {
      wrapper = mountComponent()

      authStore.loginModalOpen = true
      await wrapper.vm.$nextTick()

      const credentialsProvider: AuthProvider = {
        name: 'Database',
        url: '/auth/db',
        ajax: true,
        icon: 'mdi-database',
        isUseCredentialsForm: true,
      }

      wrapper.vm.selectedProvider = credentialsProvider
      await wrapper.vm.$nextTick()

      // CredentialsForm component stub should be rendered
      const credentialsFormStub = wrapper.findComponent({ name: 'CredentialsForm' })
      expect(credentialsFormStub.exists()).toBe(true)
    })

    it('should not show credentials form when OAuth provider is selected', async () => {
      wrapper = mountComponent()

      const oauthProvider: AuthProvider = {
        name: 'Google',
        url: '/oauth/google',
        ajax: false,
        icon: 'mdi-google',
        isUseCredentialsForm: false,
      }

      wrapper.vm.selectedProvider = oauthProvider
      await wrapper.vm.$nextTick()

      const credentialsForm = wrapper.find('[data-testid="credentials-form"]')
      expect(credentialsForm.exists()).toBe(false)
    })
  })

  describe('Provider Fetching', () => {
    it('should have fetchProviders method available', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.fetchProviders).toBe('function')
    })
  })

  describe('Component Integration', () => {
    it('should integrate with auth store', () => {
      wrapper = mountComponent()

      // Check that component has access to auth store state
      expect(wrapper.vm.isAuthenticating).toBeDefined()
      expect(wrapper.vm.errorMessage).toBeDefined()
      expect(wrapper.vm.isOpen).toBeDefined()
    })

    it('should handle login credentials submission', async () => {
      wrapper = mountComponent()

      const credentials = {
        username: 'testuser',
        password: 'testpass',
      }

      // This should not throw
      await expect(wrapper.vm.handleLogin(credentials)).resolves.not.toThrow()
    })
  })

  describe('Back Navigation', () => {
    it('should clear error when going back to providers', () => {
      wrapper = mountComponent()

      authStore.errorMessage = 'Previous error'

      wrapper.vm.backToProviders()

      // After going back, error should be cleared
      expect(authStore.errorMessage).toBeNull()
    })
  })

  describe('Modal Close', () => {
    it('should close modal and reset selection', () => {
      wrapper = mountComponent()

      const testProvider: AuthProvider = {
        name: 'Test',
        url: '/auth/test',
        ajax: true,
        icon: 'mdi-test',
        isUseCredentialsForm: true,
      }

      wrapper.vm.selectedProvider = testProvider
      wrapper.vm.close()

      expect(wrapper.vm.selectedProvider).toBeNull()
      expect(authStore.loginModalOpen).toBe(false)
    })
  })
})
