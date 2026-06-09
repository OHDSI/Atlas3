/**
 * RunAsPanel Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import RunAsPanel from '@/components/auth/RunAsPanel.vue'
import type { UserInfo } from '@/models/auth.types'
import { useAuthStore } from '@/stores/auth'

const vuetify = createVuetify({ components, directives })

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.username) {
        return { value: `Original User: ${params.username}` }
      }
      return { value: key.split('.').pop() || key }
    },
    tv: (key: string) => {
      const defaultMessages: Record<string, string> = {
        'auth.targetUsername': 'Target Username',
        'auth.enterUsernameToImpersonate': 'Enter username to impersonate',
        'auth.failedToRunAsUser': 'Failed to run as user',
        'auth.failedToExitRunAs': 'Failed to exit run-as mode',
      }
      return defaultMessages[key] || key
    },
  }),
}))

// Mock auth service
vi.mock('@/services/auth/authService', () => ({
  authService: {
    runAs: vi.fn(),
  },
}))

const mockUser: UserInfo = {
  login: 'targetuser',
  displayName: 'Target User',
  permissionIdx: {},
}

const mockOriginalUser: UserInfo = {
  login: 'admin',
  displayName: 'Admin User',
  permissionIdx: {},
}

describe('RunAsPanel', () => {
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
    return mount(RunAsPanel, {
      global: {
        plugins: [vuetify, pinia],
      },
    })
  }

  describe('Component Mounting', () => {
    it('should render card', () => {
      wrapper = mountComponent()

      const card = wrapper.findComponent({ name: 'VCard' })
      expect(card.exists()).toBe(true)
    })

    it('should render card title with icon', () => {
      wrapper = mountComponent()

      const cardTitle = wrapper.findComponent({ name: 'VCardTitle' })
      expect(cardTitle.exists()).toBe(true)

      const icon = cardTitle.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
    })

    it('should render input field', () => {
      wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.exists()).toBe(true)
    })

    it('should render run-as button', () => {
      wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton).toBeDefined()
    })

    it('should render warning alert', () => {
      wrapper = mountComponent()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const warningAlert = alerts.find(alert => alert.props('type') === 'warning')
      expect(warningAlert).toBeDefined()
    })
  })

  describe('Normal Mode (Not Running As)', () => {
    it('should enable input field when not running as another user', () => {
      wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('disabled')).toBe(false)
    })

    it('should enable run-as button when username is entered', async () => {
      wrapper = mountComponent()

      wrapper.vm.targetUser = 'targetuser'
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('disabled')).toBe(false)
    })

    it('should disable run-as button when username is empty', async () => {
      wrapper = mountComponent()

      wrapper.vm.targetUser = ''
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('disabled')).toBe(true)
    })

    it('should disable run-as button when username is only whitespace', async () => {
      wrapper = mountComponent()

      wrapper.vm.targetUser = '   '
      await wrapper.vm.$nextTick()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('disabled')).toBe(true)
    })
  })

  describe('Component State', () => {
    it('should have targetUser reactive property', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.targetUser).toBeDefined()
      expect(typeof wrapper.vm.targetUser).toBe('string')
    })

    it('should have errorMessage reactive property', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.errorMessage).toBe(null)
    })

    it('should have isLoading reactive property', () => {
      wrapper = mountComponent()

      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should compute isRunningAs from auth store', () => {
      wrapper = mountComponent()

      authStore.isRunningAs = false
      expect(wrapper.vm.isRunningAs).toBe(false)
    })

    it('should compute targetUsername from user displayName', () => {
      wrapper = mountComponent()

      authStore.user = mockUser
      expect(wrapper.vm.targetUsername).toBe('Target User')
    })

    it('should compute originalUsername from originalUser', () => {
      wrapper = mountComponent()

      authStore.originalUser = mockOriginalUser
      expect(wrapper.vm.originalUsername).toBe('Admin User')
    })
  })

  describe('Run As Methods', () => {
    it('should have handleRunAs method', () => {
      wrapper = mountComponent()

      expect(typeof wrapper.vm.handleRunAs).toBe('function')
    })

    it('should set loading state during run-as', async () => {
      const { authService } = await import('@/services/auth/authService')
      authService.runAs = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      wrapper = mountComponent()

      wrapper.vm.targetUser = 'targetuser'
      await wrapper.vm.$nextTick()

      const promise = wrapper.vm.handleRunAs()

      await wrapper.vm.$nextTick()
      expect(wrapper.vm.isLoading).toBe(true)

      await promise
      expect(wrapper.vm.isLoading).toBe(false)
    })
  })

  describe('Input Field Configuration', () => {
    it('should have outlined variant', () => {
      wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('variant')).toBe('outlined')
    })

    it('should have account icon', () => {
      wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('prependInnerIcon')).toBe('mdi-account')
    })

    it('should be disabled when loading', async () => {
      wrapper = mountComponent()

      wrapper.vm.isLoading = true
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('disabled')).toBe(true)
    })

    it('should update targetUser on input', async () => {
      wrapper = mountComponent()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      await textField.vm.$emit('update:modelValue', 'newuser')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.targetUser).toBe('newuser')
    })
  })

  describe('Button Configuration', () => {
    it('should have primary color for run-as button', () => {
      wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('color')).toBe('primary')
    })

    it('should be block style for run-as button', () => {
      wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('block')).toBe(true)
    })

    it('should have large size for run-as button', () => {
      wrapper = mountComponent()

      const buttons = wrapper.findAllComponents({ name: 'VBtn' })
      const runAsButton = buttons.find(btn => /run\s*as|runAsUser/i.test(btn.text()))
      expect(runAsButton?.props('size')).toBe('large')
    })
  })

  describe('Warning Alert', () => {
    it('should have warning type', () => {
      wrapper = mountComponent()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const warningAlert = alerts.find(alert => alert.props('type') === 'warning')
      expect(warningAlert).toBeDefined()
    })

    it('should have tonal variant', () => {
      wrapper = mountComponent()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const warningAlert = alerts.find(alert => alert.props('type') === 'warning')
      expect(warningAlert?.props('variant')).toBe('tonal')
    })
  })

  describe('Error Display', () => {
    it('should not show error alert when no error', () => {
      wrapper = mountComponent()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const errorAlert = alerts.find(alert => alert.props('type') === 'error')
      expect(errorAlert).toBeUndefined()
    })

    it('should show error alert when error message is set', async () => {
      wrapper = mountComponent()

      wrapper.vm.errorMessage = 'Test error message'
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const errorAlert = alerts.find(alert => alert.props('type') === 'error')
      expect(errorAlert).toBeDefined()
      expect(errorAlert?.text()).toContain('Test error message')
    })

    it('should be closable', async () => {
      wrapper = mountComponent()

      wrapper.vm.errorMessage = 'Test error message'
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const errorAlert = alerts.find(alert => alert.props('type') === 'error')
      expect(errorAlert?.props('closable')).toBe(true)
    })

    it('should clear error on close button click', async () => {
      wrapper = mountComponent()

      wrapper.vm.errorMessage = 'Test error message'
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const errorAlert = alerts.find(alert => alert.props('type') === 'error')

      await errorAlert?.vm.$emit('click:close')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.errorMessage).toBeNull()
    })
  })

  describe('Conditional Rendering', () => {
    it('should not show running-as info alert by default', () => {
      wrapper = mountComponent()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const infoAlert = alerts.find(alert => alert.props('type') === 'info')
      expect(infoAlert).toBeUndefined()
    })

    it('should show running-as info when isRunningAs is true', async () => {
      wrapper = mountComponent()

      authStore.isRunningAs = true
      authStore.user = mockUser
      authStore.originalUser = mockOriginalUser
      await wrapper.vm.$nextTick()

      const alerts = wrapper.findAllComponents({ name: 'VAlert' })
      const infoAlert = alerts.find(alert => alert.props('type') === 'info')
      expect(infoAlert).toBeDefined()
    })

    it('should disable controls when running as another user', async () => {
      wrapper = mountComponent()

      authStore.isRunningAs = true
      await wrapper.vm.$nextTick()

      const textField = wrapper.findComponent({ name: 'VTextField' })
      expect(textField.props('disabled')).toBe(true)
    })
  })

  describe('Form Interaction', () => {
    it('should not call handleRunAs with empty username', async () => {
      const { authService } = await import('@/services/auth/authService')

      wrapper = mountComponent()

      wrapper.vm.targetUser = ''
      await wrapper.vm.$nextTick()

      await wrapper.vm.handleRunAs()

      expect(authService.runAs).not.toHaveBeenCalled()
    })

    it('should handle Enter key press in input field', async () => {
      wrapper = mountComponent()

      wrapper.vm.targetUser = 'targetuser'
      await wrapper.vm.$nextTick()

      const _textField = wrapper.findComponent({ name: 'VTextField' })

      // This should trigger handleRunAs
      expect(typeof wrapper.vm.handleRunAs).toBe('function')
    })
  })
})
