/**
 * Unit Tests: useI18n Composable
 * Tests for src/composables/useI18n.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
  },
}))

describe('useI18n', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('t function (reactive)', () => {
    it('returns computed ref with translation', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          greeting: 'Hello',
        },
      })

      const { t } = useI18n()
      const result = t('greeting')

      expect(result.value).toBe('Hello')
    })

    it('returns key when translation not found and not initialized', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
        initialized: false,
      })

      const { t } = useI18n()
      const result = t('missing.key')

      expect(result.value).toBe('missing.key')
    })

    it('returns default value when translation not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
      })

      const { t } = useI18n()
      const result = t('missing.key', 'Default Text')

      expect(result.value).toBe('Default Text')
    })

    it('interpolates parameters', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          welcome: 'Hello, {name}!',
        },
      })

      const { t } = useI18n()
      const result = t('welcome', { name: 'John' })

      expect(result.value).toBe('Hello, John!')
    })

    it('interpolates multiple parameters', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          message: '{greeting}, {name}! You have {count} messages.',
        },
      })

      const { t } = useI18n()
      const result = t('message', { greeting: 'Hi', name: 'Jane', count: '5' })

      expect(result.value).toBe('Hi, Jane! You have 5 messages.')
    })

    it('keeps placeholder if param not provided', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          partial: 'Hello, {name}! Your id is {id}.',
        },
      })

      const { t } = useI18n()
      const result = t('partial', { name: 'Bob' })

      expect(result.value).toBe('Hello, Bob! Your id is {id}.')
    })

    it('supports nested keys', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          nav: {
            home: 'Home',
            about: 'About Us',
          },
        },
      })

      const { t } = useI18n()

      expect(t('nav.home').value).toBe('Home')
      expect(t('nav.about').value).toBe('About Us')
    })

    it('supports deeply nested keys', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          pages: {
            user: {
              profile: {
                title: 'User Profile',
              },
            },
          },
        },
      })

      const { t } = useI18n()
      const result = t('pages.user.profile.title')

      expect(result.value).toBe('User Profile')
    })

    it('falls back to English when key not in current locale', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        locale: 'fr',
        translations: {},
        translationCache: new Map([
          ['en', { bundle: { translations: { fallbackKey: 'English Fallback' } }, format: {} }],
        ]),
      })

      const { t } = useI18n()
      const result = t('fallbackKey')

      expect(result.value).toBe('English Fallback')
    })
  })

  describe('tv function (non-reactive)', () => {
    it('returns string directly', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          greeting: 'Hello',
        },
      })

      const { tv } = useI18n()
      const result = tv('greeting')

      expect(typeof result).toBe('string')
      expect(result).toBe('Hello')
    })

    it('returns default value when key not found', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
      })

      const { tv } = useI18n()
      const result = tv('missing', 'Default')

      expect(result).toBe('Default')
    })

    it('interpolates parameters', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          hello: 'Hello, {name}!',
        },
      })

      const { tv } = useI18n()
      const result = tv('hello', { name: 'World' })

      expect(result).toBe('Hello, World!')
    })

    it('supports defaultValue with params signature', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
      })

      const { tv } = useI18n()
      const result = tv('missing', 'Hello, {name}!', { name: 'Test' })

      expect(result).toBe('Hello, Test!')
    })
  })

  describe('locale computed', () => {
    it('returns current locale from store', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ locale: 'fr' })

      const { locale } = useI18n()

      expect(locale.value).toBe('fr')
    })
  })

  describe('availableLocales computed', () => {
    it('returns available locales from store', () => {
      const localeStore = useLocaleStore()
      const locales = [
        { code: 'en', name: 'English' },
        { code: 'fr', name: 'French' },
      ]
      localeStore.$patch({ availableLocales: locales })

      const { availableLocales } = useI18n()

      expect(availableLocales.value).toEqual(locales)
    })
  })

  describe('changeLocale', () => {
    it('calls store changeLocale method', async () => {
      const localeStore = useLocaleStore()
      const changeSpy = vi.spyOn(localeStore, 'changeLocale').mockResolvedValue()

      const { changeLocale } = useI18n()
      await changeLocale('fr')

      expect(changeSpy).toHaveBeenCalledWith('fr')
    })
  })

  describe('loading computed', () => {
    it('returns loading state from store', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ loading: true })

      const { loading } = useI18n()

      expect(loading.value).toBe(true)
    })
  })

  describe('error computed', () => {
    it('returns error from store', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ error: 'Failed to load translations' })

      const { error } = useI18n()

      expect(error.value).toBe('Failed to load translations')
    })

    it('returns null when no error', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({ error: null })

      const { error } = useI18n()

      expect(error.value).toBeNull()
    })
  })

  describe('format computed', () => {
    it('returns locale format from store', () => {
      const localeStore = useLocaleStore()
      const format = { dateFormat: 'DD/MM/YYYY', numberFormat: { decimal: ',' } }
      // localeFormat getter reads from translationCache.get(locale)?.bundle.format
      localeStore.$patch({
        locale: 'en',
        translationCache: new Map([
          ['en', { bundle: { translations: {}, format }, loadedAt: Date.now() }],
        ]),
      })

      const { format: localeFormat } = useI18n()

      expect(localeFormat.value).toEqual(format)
    })
  })

  describe('edge cases', () => {
    it('handles null in nested path', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          nested: null,
        },
      })

      const { t } = useI18n()
      const result = t('nested.deep')

      expect(result.value).toBe('nested.deep')
    })

    it('handles undefined in nested path', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {},
      })

      const { t } = useI18n()
      const result = t('undefined.path.to.key')

      expect(result.value).toBe('undefined.path.to.key')
    })

    it('handles non-string values at path end', () => {
      const localeStore = useLocaleStore()
      localeStore.$patch({
        translations: {
          number: 123,
          boolean: true,
          object: { nested: 'value' },
        },
      })

      const { t } = useI18n()

      // These should return the key since value is not a string
      expect(t('number').value).toBe('number')
      expect(t('boolean').value).toBe('boolean')
      expect(t('object').value).toBe('object')
    })
  })
})
