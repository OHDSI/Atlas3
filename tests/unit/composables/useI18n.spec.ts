/**
 * useI18n Composable Tests
 * Tests for internationalization
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'

describe('useI18n', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('t (reactive translation)', () => {
    it('should return translation for key', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          common: {
            save: 'Save',
          },
        },
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('common.save')
      expect(translation.value).toBe('Save')
    })

    it('should return key when translation not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('missing.key')
      expect(translation.value).toBe('missing.key')
    })

    it('should use default value when translation not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('missing.key', 'Default Value')
      expect(translation.value).toBe('Default Value')
    })

    it('should interpolate parameters', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          greeting: 'Hello, {name}!',
        },
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('greeting', { name: 'World' })
      expect(translation.value).toBe('Hello, World!')
    })

    it('should interpolate with default value and params', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('missing', 'Hello, {name}!', { name: 'User' })
      expect(translation.value).toBe('Hello, User!')
    })

    it('should keep unmatched placeholders', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          message: 'Hello, {name}! You have {count} messages.',
        },
        initialized: true,
      })

      const { t } = useI18n()

      const translation = t('message', { name: 'User' })
      expect(translation.value).toBe('Hello, User! You have {count} messages.')
    })
  })

  describe('tv (non-reactive translation)', () => {
    it('should return translation string directly', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          button: {
            submit: 'Submit',
          },
        },
        initialized: true,
      })

      const { tv } = useI18n()

      const translation = tv('button.submit')
      expect(translation).toBe('Submit')
      expect(typeof translation).toBe('string')
    })

    it('should return key when translation not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: true,
      })

      const { tv } = useI18n()

      expect(tv('unknown.key')).toBe('unknown.key')
    })

    it('should use default value when translation not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: true,
      })

      const { tv } = useI18n()

      expect(tv('unknown.key', 'Default')).toBe('Default')
    })

    it('should interpolate parameters', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          count: '{n} items',
        },
        initialized: true,
      })

      const { tv } = useI18n()

      expect(tv('count', { n: 5 })).toBe('5 items')
    })
  })

  describe('locale', () => {
    it('should return current locale', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        locale: 'en',
      })

      const { locale } = useI18n()

      expect(locale.value).toBe('en')
    })
  })

  describe('availableLocales', () => {
    it('should return available locales', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        availableLocales: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
        ],
      })

      const { availableLocales } = useI18n()

      expect(availableLocales.value).toHaveLength(2)
      expect(availableLocales.value[0].code).toBe('en')
    })
  })

  describe('changeLocale', () => {
    it('should change locale via store', async () => {
      const localeStore = useLocaleStore()
      const changeLocaleSpy = vi.spyOn(localeStore, 'changeLocale').mockResolvedValue()

      const { changeLocale } = useI18n()

      await changeLocale('es')

      expect(changeLocaleSpy).toHaveBeenCalledWith('es')
    })
  })

  describe('loading', () => {
    it('should reflect store loading state', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ loading: true })

      const { loading } = useI18n()

      expect(loading.value).toBe(true)
    })
  })

  describe('error', () => {
    it('should reflect store error state', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ error: 'Translation error' })

      const { error } = useI18n()

      expect(error.value).toBe('Translation error')
    })
  })

  describe('nested translations', () => {
    it('should handle deeply nested keys', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          level1: {
            level2: {
              level3: {
                value: 'Deep Value',
              },
            },
          },
        },
        initialized: true,
      })

      const { tv } = useI18n()

      expect(tv('level1.level2.level3.value')).toBe('Deep Value')
    })

    it('should return key for invalid nested path', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          level1: {
            level2: 'string value', // Not an object
          },
        },
        initialized: true,
      })

      const { tv } = useI18n()

      expect(tv('level1.level2.level3')).toBe('level1.level2.level3')
    })
  })
})
