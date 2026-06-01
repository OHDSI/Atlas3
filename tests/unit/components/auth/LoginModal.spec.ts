/**
 * LoginModal Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LoginModal from '@/components/auth/LoginModal.vue'
import type { AuthProvider } from '@/models/auth.types'
import { useAuthStore } from '@/stores/auth'
import { authService } from '@/services/auth/authService'

const vuetify = createVuetify({ components, directives })

const credentialsProvider: AuthProvider = {
  name: 'Database',
  url: '/auth/db',
  ajax: true,
  icon: 'mdi-database',
  isUseCredentialsForm: true,
}

const ajaxProvider: AuthProvider = {
  name: 'Windows',
  url: '/auth/windows',
  ajax: true,
  icon: 'mdi-microsoft-windows',
  isUseCredentialsForm: false,
}

const redirectProvider: AuthProvider = {
  name: 'Google',
  url: '/oauth/google',
  ajax: false,
  icon: 'mdi-google',
  isUseCredentialsForm: false,
}

const stubCredentials = {
  username: 'stub-user',
  password: 'stub-password',
}

vi.mock('@/components/ui', () => ({
  AtlasDialog: defineComponent({
    name: 'AtlasDialog',
    props: {
      modelValue: { type: Boolean, default: false },
      maxWidth: { type: [String, Number], default: undefined },
      persistent: { type: Boolean, default: false },
    },
    emits: ['update:modelValue'],
    template: `
      <div
        data-testid="atlas-dialog"
        :data-open="String(modelValue)"
        :data-persistent="String(persistent)"
        :data-max-width="String(maxWidth ?? '')"
      >
        <slot v-if="modelValue" />
      </div>
    `,
  }),
  AtlasButton: defineComponent({
    name: 'AtlasButton',
    emits: ['click'],
    template: '<button type="button" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  }),
  AtlasIcon: defineComponent({
    name: 'AtlasIcon',
    template: '<span v-bind="$attrs"><slot /></span>',
  }),
  AtlasIconButton: defineComponent({
    name: 'AtlasIconButton',
    emits: ['click'],
    template: '<button type="button" data-testid="dismiss-error" v-bind="$attrs" @click="$emit(\'click\')"><slot /></button>',
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/config/auth.config', () => ({
  getAuthConfig: () => ({
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
  }),
}))

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

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (_unusedKey: string, defaultValue: string) => ({
      value: defaultValue,
      toString: () => defaultValue,
    }),
  }),
}))

describe('LoginModal', () => {
  let wrapper: VueWrapper
  let pinia: ReturnType<typeof createPinia>
  let authStore: ReturnType<typeof useAuthStore>

  beforeEach(() => {
    pinia = createPinia()
    setActivePinia(pinia)
    authStore = useAuthStore()
    vi.clearAllMocks()
    vi.mocked(authService.fetchOAuthProviders).mockResolvedValue([credentialsProvider])
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
            props: ['provider', 'loading'],
            emits: ['submit'],
            template: `
              <form
                data-testid="credentials-form"
                @submit.prevent="$emit('submit', { username: '${stubCredentials.username}', password: '${stubCredentials.password}' })"
              >
                <button type="submit">Submit credentials</button>
              </form>
            `,
          },
        },
      },
    })
  }

  async function openModal(providers: AuthProvider[] = [credentialsProvider]) {
    vi.mocked(authService.fetchOAuthProviders).mockResolvedValue(providers)
    wrapper = mountComponent()
    authStore.loginModalOpen = true
    await flushPromises()
  }

  function providerButtons() {
    return wrapper.findAll('.login-card__provider-btn')
  }

  function providerButtonAt(index: number) {
    const button = providerButtons()[index]
    expect(button).toBeDefined()
    return button!
  }

  describe('rendering', () => {
    it('renders a closed persistent dialog by default', () => {
      wrapper = mountComponent()

      const dialog = wrapper.get('[data-testid="atlas-dialog"]')
      expect(dialog.attributes('data-open')).toBe('false')
      expect(dialog.attributes('data-persistent')).toBe('true')
      expect(dialog.attributes('data-max-width')).toBe('440')
      expect(wrapper.find('.login-card').exists()).toBe(false)
    })

    it('renders the card and heading when the modal opens', async () => {
      await openModal([credentialsProvider, ajaxProvider])

      expect(authService.fetchOAuthProviders).toHaveBeenCalledTimes(1)
      expect(wrapper.find('.login-card').exists()).toBe(true)
      expect(wrapper.get('.login-card__title').text()).toBe('Welcome back')
      expect(wrapper.get('.login-card__subtitle').text()).toBe('Sign in to continue')
    })

    it('renders provider buttons returned from fetch', async () => {
      await openModal([credentialsProvider, ajaxProvider, redirectProvider])

      const buttons = providerButtons()
      expect(buttons).toHaveLength(3)
      expect(buttons.map(button => button.text())).toEqual(['Database', 'Windows', 'Google'])
      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(false)
    })

    it('falls back to config providers when fetch returns no providers', async () => {
      await openModal([])

      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(true)
      expect(providerButtons()).toHaveLength(0)
    })

    it('falls back to config providers when fetch fails', async () => {
      vi.mocked(authService.fetchOAuthProviders).mockRejectedValueOnce(new Error('network error'))
      wrapper = mountComponent()
      authStore.loginModalOpen = true
      await flushPromises()

      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(true)
      expect(providerButtons()).toHaveLength(0)
    })
  })

  describe('provider interactions', () => {
    it('shows the credentials form after selecting a credentials provider', async () => {
      await openModal([credentialsProvider, ajaxProvider])

      await providerButtonAt(0).trigger('click')

      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(true)
      expect(wrapper.get('.login-card__back-btn').text()).toBe('Back')
      expect(wrapper.find('.login-card__providers').exists()).toBe(false)
    })

    it('submits credentials from the credentials form through authService.login', async () => {
      vi.mocked(authService.login).mockResolvedValue()
      await openModal([credentialsProvider, ajaxProvider])

      await providerButtonAt(0).trigger('click')
      await wrapper.get('[data-testid="credentials-form"]').trigger('submit')

      expect(authService.login).toHaveBeenCalledWith(credentialsProvider, stubCredentials)
    })

    it('calls authService.login for ajax providers without a credentials form', async () => {
      vi.mocked(authService.login).mockResolvedValue()
      await openModal([credentialsProvider, ajaxProvider])

      await providerButtonAt(1).trigger('click')

      expect(authService.login).toHaveBeenCalledWith(ajaxProvider, undefined)
      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(false)
    })

    it('calls authService.login for redirect providers without a credentials form', async () => {
      vi.mocked(authService.login).mockResolvedValue()
      await openModal([credentialsProvider, redirectProvider])

      await providerButtonAt(1).trigger('click')

      expect(authService.login).toHaveBeenCalledWith(redirectProvider, undefined)
      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(false)
    })

    it('returns to the provider list and clears errors when back is clicked', async () => {
      await openModal([credentialsProvider, ajaxProvider])
      await providerButtonAt(0).trigger('click')
      authStore.errorMessage = 'Previous error'
      await flushPromises()

      await wrapper.get('.login-card__back-btn').trigger('click')

      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(providerButtons()).toHaveLength(2)
      expect(wrapper.find('[data-testid="credentials-form"]').exists()).toBe(false)
      expect(authStore.errorMessage).toBeNull()
    })
  })

  describe('error handling and closing', () => {
    it('shows the auth store error and clears it when dismissed', async () => {
      await openModal([credentialsProvider, ajaxProvider])
      authStore.errorMessage = 'Test error message'
      await flushPromises()

      expect(wrapper.get('[role="alert"]').text()).toContain('Test error message')

      await wrapper.get('[data-testid="dismiss-error"]').trigger('click')

      expect(authStore.errorMessage).toBeNull()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })

    it('closes the modal when the dialog emits update:modelValue false', async () => {
      await openModal([credentialsProvider, ajaxProvider])
      await providerButtonAt(0).trigger('click')

      wrapper.findComponent({ name: 'AtlasDialog' }).vm.$emit('update:modelValue', false)
      await flushPromises()

      expect(authStore.loginModalOpen).toBe(false)
      expect(wrapper.find('.login-card').exists()).toBe(false)
    })
  })
})
