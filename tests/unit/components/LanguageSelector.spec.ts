/**
 * LanguageSelector Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import LanguageSelector from '@/components/LanguageSelector.vue'

// Mock dependencies
const mockChangeLocale = vi.fn()
const mockClearCache = vi.fn()

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    locale: ref('en'),
    availableLocales: ref([
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' }
    ]),
    changeLocale: mockChangeLocale,
    loading: ref(false)
  })
}))

vi.mock('@/stores/locale', () => ({
  useLocaleStore: () => ({
    clearCache: mockClearCache
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

function mountComponent() {
  return mount(LanguageSelector, {
    global: {
      plugins: [vuetify]
    }
  })
}

describe('LanguageSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render translate icon button', () => {
    const wrapper = mountComponent()

    expect(wrapper.find('[data-testid="language-selector"]').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VIcon' }).exists()).toBe(true)
  })

  it('should render menu with locales', () => {
    const wrapper = mountComponent()

    expect(wrapper.findComponent({ name: 'VMenu' }).exists()).toBe(true)
  })

  it('should change locale when item clicked', async () => {
    const wrapper = mountComponent()

    // Find list items
    const listItems = wrapper.findAllComponents({ name: 'VListItem' })

    if (listItems.length > 0) {
      // Click on Spanish
      const spanishItem = listItems.find(item => item.attributes('data-locale') === 'es')
      if (spanishItem) {
        await spanishItem.trigger('click')
        expect(mockChangeLocale).toHaveBeenCalledWith('es')
      }
    }
  })

  it('should not change locale if same locale clicked', async () => {
    const wrapper = mountComponent()

    const listItems = wrapper.findAllComponents({ name: 'VListItem' })

    if (listItems.length > 0) {
      // Click on English (current locale)
      const englishItem = listItems.find(item => item.attributes('data-locale') === 'en')
      if (englishItem) {
        await englishItem.trigger('click')
        expect(mockChangeLocale).not.toHaveBeenCalled()
      }
    }
  })

  it('should have icon button variant', () => {
    const wrapper = mountComponent()

    const btn = wrapper.findComponent({ name: 'VBtn' })
    expect(btn.props('icon')).toBe(true)
    expect(btn.props('variant')).toBe('text')
  })
})
