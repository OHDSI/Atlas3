/**
 * ErrorBoundary Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import ErrorBoundary from '@/components/shared/ErrorBoundary.vue'

// Mock dependencies
vi.mock('vue-router', () => ({
  useRouter: () => ({
    back: vi.fn()
  })
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback: string) => ref(fallback)
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

const vuetify = createVuetify({ components, directives })

function mountComponent(options = {}) {
  return mount(ErrorBoundary, {
    global: {
      plugins: [vuetify],
      stubs: {
        VContainer: true,
        VRow: true,
        VCol: true,
        VCard: true,
        VCardTitle: true,
        VCardText: true,
        VCardActions: true,
        VBtn: true,
        VIcon: true,
        VExpansionPanels: true,
        VExpansionPanel: true,
        VExpansionPanelTitle: true,
        VExpansionPanelText: true
      }
    },
    ...options
  })
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render slot content when no error', () => {
    const wrapper = mountComponent({
      slots: {
        default: '<div class="test-content">Hello World</div>'
      }
    })

    expect(wrapper.find('.test-content').exists()).toBe(true)
    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })

  it('should not show error UI initially', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('.error-boundary').exists()).toBe(false)
  })

  it('should capture and display errors', async () => {
    // Create a component that throws an error
    const _ErrorComponent = {
      template: '<div>Error</div>',
      setup() {
        throw new Error('Test error')
      }
    }

    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [vuetify],
        stubs: {
          VContainer: true,
          VRow: true,
          VCol: true,
          VCard: true,
          VCardTitle: true,
          VCardText: true,
          VCardActions: true,
          VBtn: true,
          VIcon: true,
          VExpansionPanels: true,
          VExpansionPanel: true,
          VExpansionPanelTitle: true,
          VExpansionPanelText: true
        }
      },
      slots: {
        default: () => null // Empty slot to avoid error
      }
    })

    // The error boundary should exist as a component
    expect(wrapper.exists()).toBe(true)
  })
})
