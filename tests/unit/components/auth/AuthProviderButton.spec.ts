/**
 * AuthProviderButton Component Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AuthProviderButton from '@/components/auth/AuthProviderButton.vue'
import type { AuthProvider } from '@/models/auth.types'

const vuetify = createVuetify({ components, directives })

const mockProvider: AuthProvider = {
  name: 'Database',
  url: '/auth/db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

function mountComponent(props = {}) {
  return mount(AuthProviderButton, {
    props: {
      provider: mockProvider,
      ...props,
    },
    global: {
      plugins: [vuetify],
    },
  })
}

describe('AuthProviderButton', () => {
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
    it('should render the button', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.exists()).toBe(true)
    })

    it('should display provider name as button text', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.text()).toBe('Database')
    })

    it('should render with different provider name', () => {
      const googleProvider: AuthProvider = {
        name: 'Google OAuth',
        url: '/oauth/google',
        ajax: false,
        icon: 'mdi-google',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider: googleProvider })

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.text()).toBe('Google OAuth')
    })
  })

  describe('Button Configuration', () => {
    it('should have outlined variant', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('variant')).toBe('outlined')
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

    it('should have mb-2 class for margin', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.classes()).toContain('mb-2')
    })

    it('should have prepend-icon from provider', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('prependIcon')).toBe('mdi-database')
    })

    it('should use different icon for different provider', () => {
      const ldapProvider: AuthProvider = {
        name: 'LDAP',
        url: '/auth/ldap',
        ajax: true,
        icon: 'mdi-account-key',
        isUseCredentialsForm: true,
      }

      wrapper = mountComponent({ provider: ldapProvider })

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('prependIcon')).toBe('mdi-account-key')
    })
  })

  describe('Click Event', () => {
    it('should emit click event with provider when clicked', async () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      await button.trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')![0]).toEqual([mockProvider])
    })

    it('should emit correct provider for different providers', async () => {
      const githubProvider: AuthProvider = {
        name: 'GitHub',
        url: '/oauth/github',
        ajax: false,
        icon: 'mdi-github',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider: githubProvider })

      const button = wrapper.findComponent({ name: 'VBtn' })
      await button.trigger('click')

      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')![0]).toEqual([githubProvider])
    })

    it('should emit click event multiple times', async () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })

      await button.trigger('click')
      await button.trigger('click')
      await button.trigger('click')

      expect(wrapper.emitted('click')!.length).toBe(3)
    })

    it('should emit event via handleClick method', async () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      await button.trigger('click')

      // Verify the method worked by checking the event was emitted
      expect(wrapper.emitted('click')).toBeTruthy()
      expect(wrapper.emitted('click')!.length).toBe(1)
    })
  })

  describe('Provider Props', () => {
    it('should accept provider with isUseCredentialsForm true', () => {
      const provider: AuthProvider = {
        name: 'Test',
        url: '/auth/test',
        ajax: true,
        icon: 'mdi-test',
        isUseCredentialsForm: true,
      }

      wrapper = mountComponent({ provider })

      expect(wrapper.props('provider')).toEqual(provider)
    })

    it('should accept provider with isUseCredentialsForm false', () => {
      const provider: AuthProvider = {
        name: 'OAuth Provider',
        url: '/oauth/provider',
        ajax: false,
        icon: 'mdi-cloud',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider })

      expect(wrapper.props('provider')).toEqual(provider)
    })

    it('should accept provider with optional loginPlaceholder', () => {
      const provider: AuthProvider = {
        name: 'Custom',
        url: '/auth/custom',
        ajax: true,
        icon: 'mdi-custom',
        isUseCredentialsForm: true,
        loginPlaceholder: 'Custom Login',
      }

      wrapper = mountComponent({ provider })

      expect(wrapper.props('provider').loginPlaceholder).toBe('Custom Login')
    })

    it('should accept provider with optional passwordPlaceholder', () => {
      const provider: AuthProvider = {
        name: 'Custom',
        url: '/auth/custom',
        ajax: true,
        icon: 'mdi-custom',
        isUseCredentialsForm: true,
        passwordPlaceholder: 'Custom Password',
      }

      wrapper = mountComponent({ provider })

      expect(wrapper.props('provider').passwordPlaceholder).toBe('Custom Password')
    })

    it('should handle provider with ajax false', () => {
      const provider: AuthProvider = {
        name: 'Non-AJAX Provider',
        url: '/auth/noajax',
        ajax: false,
        icon: 'mdi-link',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider })

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.text()).toBe('Non-AJAX Provider')
    })
  })

  describe('Accessibility', () => {
    it('should render as a button element', () => {
      wrapper = mountComponent()

      const button = wrapper.find('button')
      expect(button.exists()).toBe(true)
    })

    it('should have appropriate text for screen readers', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.text()).toBeTruthy()
      expect(button.text().length).toBeGreaterThan(0)
    })

    it('should include icon for visual identification', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('prependIcon')).toBeTruthy()
    })
  })

  describe('Visual Appearance', () => {
    it('should render as full width block button', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.props('block')).toBe(true)
    })

    it('should have consistent size across different providers', () => {
      const providers: AuthProvider[] = [
        { name: 'A', url: '/a', ajax: true, icon: 'mdi-a', isUseCredentialsForm: true },
        { name: 'B', url: '/b', ajax: true, icon: 'mdi-b', isUseCredentialsForm: false },
      ]

      for (const provider of providers) {
        wrapper = mountComponent({ provider })
        const button = wrapper.findComponent({ name: 'VBtn' })
        expect(button.props('size')).toBe('large')
        wrapper.unmount()
      }
    })

    it('should have consistent margin bottom', () => {
      wrapper = mountComponent()

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.classes()).toContain('mb-2')
    })
  })

  describe('Integration', () => {
    it('should work with different icon types', () => {
      const icons = ['mdi-database', 'mdi-google', 'mdi-github', 'mdi-microsoft', 'mdi-account']

      icons.forEach((icon, index) => {
        const provider: AuthProvider = {
          name: `Provider ${index}`,
          url: `/auth/${index}`,
          ajax: true,
          icon,
          isUseCredentialsForm: true,
        }

        wrapper = mountComponent({ provider })
        const button = wrapper.findComponent({ name: 'VBtn' })
        expect(button.props('prependIcon')).toBe(icon)
        wrapper.unmount()
      })
    })

    it('should handle provider name with special characters', () => {
      const provider: AuthProvider = {
        name: 'Test & Provider (OAuth 2.0)',
        url: '/auth/test',
        ajax: true,
        icon: 'mdi-test',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider })

      const button = wrapper.findComponent({ name: 'VBtn' })
      expect(button.text()).toBe('Test & Provider (OAuth 2.0)')
    })

    it('should handle provider URL with query parameters', () => {
      const provider: AuthProvider = {
        name: 'Provider with Query',
        url: '/auth/provider?redirect=/home',
        ajax: true,
        icon: 'mdi-link',
        isUseCredentialsForm: false,
      }

      wrapper = mountComponent({ provider })

      expect(wrapper.props('provider').url).toBe('/auth/provider?redirect=/home')
    })
  })
})
