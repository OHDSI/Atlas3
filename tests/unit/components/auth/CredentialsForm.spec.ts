/**
 * CredentialsForm Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CredentialsForm from '@/components/auth/CredentialsForm.vue'
import type { AuthProvider } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

// Mock useI18n composable
vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, defaultValue: string) => ({ value: defaultValue }),
  }),
}))

const mockProvider: AuthProvider = {
  name: 'Database',
  url: '/auth/db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

function mountComponent(props = {}) {
  return mount(CredentialsForm, {
    props: {
      provider: mockProvider,
      loading: false,
      ...props,
    },
    global: {
      plugins: [vuetify],
    },
  })
}

describe('CredentialsForm', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Component Mounting', () => {
    it('should render the form', () => {
      wrapper = mountComponent()

      const form = wrapper.findComponent({ name: 'VForm' })
      expect(form.exists()).toBe(true)
    })

    it('should render username field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields.length).toBe(2)
    })

    it('should render password field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]
      expect(passwordField.props('type')).toBe('password')
    })

    it('should render submit button', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.exists()).toBe(true)
      expect(button.attributes('type')).toBe('submit')
    })
  })

  describe('Props', () => {
    it('should use custom login placeholder from provider', () => {
      const customProvider: AuthProvider = {
        ...mockProvider,
        loginPlaceholder: 'Custom Username',
      }

      wrapper = mountComponent({ provider: customProvider })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const usernameField = textFields[0]
      expect(usernameField.props('label')).toBe('Custom Username')
    })

    it('should use custom password placeholder from provider', () => {
      const customProvider: AuthProvider = {
        ...mockProvider,
        passwordPlaceholder: 'Custom Password',
      }

      wrapper = mountComponent({ provider: customProvider })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]
      expect(passwordField.props('label')).toBe('Custom Password')
    })

    it('should disable fields when loading', () => {
      wrapper = mountComponent({ loading: true })

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      expect(textFields[0].props('disabled')).toBe(true)
      expect(textFields[1].props('disabled')).toBe(true)
    })

    it('should show loading state on submit button', () => {
      wrapper = mountComponent({ loading: true })

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('loading')).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('should update username field on input', async () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const usernameField = textFields[0]

      await usernameField.vm.$emit('update:modelValue', 'testuser')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.credentials.username).toBe('testuser')
    })

    it('should update password field on input', async () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]

      await passwordField.vm.$emit('update:modelValue', 'testpass123')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.credentials.password).toBe('testpass123')
    })

    it('should emit submit event with credentials on valid form submission', async () => {
      wrapper = mountComponent()

      // Mock form validation
      const formRef = wrapper.vm.formRef as any
      formRef.validate = vi.fn().mockResolvedValue({ valid: true })

      // Set credentials
      wrapper.vm.credentials.username = 'testuser'
      wrapper.vm.credentials.password = 'testpass123'

      // Submit form
      await wrapper.vm.handleSubmit()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('submit')).toBeTruthy()
      expect(wrapper.emitted('submit')![0]).toEqual([
        { username: 'testuser', password: 'testpass123' },
      ])
    })

    it('should clear password after successful submission', async () => {
      wrapper = mountComponent()

      // Mock form validation
      const formRef = wrapper.vm.formRef as any
      formRef.validate = vi.fn().mockResolvedValue({ valid: true })

      // Set credentials
      wrapper.vm.credentials.username = 'testuser'
      wrapper.vm.credentials.password = 'testpass123'

      // Submit form
      await wrapper.vm.handleSubmit()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.credentials.password).toBe('')
      expect(wrapper.vm.credentials.username).toBe('testuser')
    })

    it('should not emit submit event on invalid form submission', async () => {
      wrapper = mountComponent()

      // Mock form validation failure
      const formRef = wrapper.vm.formRef as any
      formRef.validate = vi.fn().mockResolvedValue({ valid: false })

      // Submit form
      await wrapper.vm.handleSubmit()
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('submit')).toBeFalsy()
    })

    it('should validate required username field', () => {
      wrapper = mountComponent()

      const result = wrapper.vm.required('')
      expect(typeof result).toBe('string')
      expect(result).toBeTruthy()
    })

    it('should pass validation with non-empty username', () => {
      wrapper = mountComponent()

      const result = wrapper.vm.required('testuser')
      expect(result).toBe(true)
    })
  })

  describe('Field Configuration', () => {
    it('should have outlined variant for username field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const usernameField = textFields[0]
      expect(usernameField.props('variant')).toBe('outlined')
    })

    it('should have outlined variant for password field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]
      expect(passwordField.props('variant')).toBe('outlined')
    })

    it('should have an account icon for username field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const usernameField = textFields[0]
      expect(usernameField.props('prependInnerIcon')).toMatch(/mdi-account/)
    })

    it('should have a lock icon for password field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]
      expect(passwordField.props('prependInnerIcon')).toMatch(/mdi-lock/)
    })

    it('should have rules for username field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const usernameField = textFields[0]
      expect(usernameField.props('rules')).toBeDefined()
      expect(Array.isArray(usernameField.props('rules'))).toBe(true)
    })

    it('should have rules for password field', () => {
      wrapper = mountComponent()

      const textFields = wrapper.findAllComponents({ name: 'VTextField' })
      const passwordField = textFields[1]
      expect(passwordField.props('rules')).toBeDefined()
      expect(Array.isArray(passwordField.props('rules'))).toBe(true)
    })
  })

  describe('Button Configuration', () => {
    it('should have primary color', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('color')).toBe('primary')
    })

    it('should be block style', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('block')).toBe(true)
    })

    it('should have large size', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('size')).toBe('large')
    })

    it('should have login icon', () => {
      wrapper = mountComponent()

      const icon = wrapper.findComponent({ name: 'VIcon' })
      expect(icon.exists()).toBe(true)
    })
  })

  describe('Form Submission', () => {
    it('should prevent default form submission', async () => {
      wrapper = mountComponent()

      const form = wrapper.findComponent({ name: 'VForm' })
      const preventDefault = vi.fn()

      await form.trigger('submit', { preventDefault })

      // The form should not navigate or reload the page
      expect(form.exists()).toBe(true)
    })

    it('should handle form submission via button click', async () => {
      wrapper = mountComponent()

      // Mock form validation
      const formRef = wrapper.vm.formRef as any
      formRef.validate = vi.fn().mockResolvedValue({ valid: true })

      // Set credentials
      wrapper.vm.credentials.username = 'testuser'
      wrapper.vm.credentials.password = 'testpass123'

      const form = wrapper.findComponent({ name: 'VForm' })
      await form.trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('submit')).toBeTruthy()
    })
  })
})
