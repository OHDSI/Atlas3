/**
 * Probe: does the INLINE `{{ t('key') }}` pattern (used in ~463 places)
 * re-render when the locale changes? (vs. the setup-returned ref pattern)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'

vi.mock('@/services/i18n', () => ({
  i18nService: {
    fetchLocales: vi.fn().mockResolvedValue([{ code: 'en', name: 'English' }]),
    fetchTranslations: vi
      .fn()
      .mockResolvedValue({ locale: 'en', translations: {}, fetchedAt: new Date() }),
  },
}))
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

// Mirrors real component usage: t() called inline inside the template.
const InlineConsumer = defineComponent({
  setup() {
    const { t } = useI18n()
    return { t }
  },
  template: `<div class="lbl">{{ t('navigation.cohortdefinitions', 'Cohort Definitions') }}</div>`,
})

// Also exercise tv() (non-reactive helper) for comparison.
const TvConsumer = defineComponent({
  setup() {
    const { tv } = useI18n()
    return { tv }
  },
  template: `<div class="lbl">{{ tv('navigation.cohortdefinitions', 'Cohort Definitions') }}</div>`,
})

describe('inline t()/tv() reactivity on locale switch', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('inline {{ t() }} re-renders to Japanese', async () => {
    const store = useLocaleStore()
    await store.initialize()

    const w = mount(InlineConsumer)
    expect(w.text()).toContain('Cohort Definitions')

    await store.changeLocale('ja')
    await nextTick()
    await nextTick()

    expect(w.text()).toContain('コホート定義')
  })

  it('inline {{ tv() }} also re-renders (read happens during render → tracked)', async () => {
    const store = useLocaleStore()
    await store.initialize()

    const w = mount(TvConsumer)
    expect(w.text()).toContain('Cohort Definitions')

    await store.changeLocale('ja')
    await nextTick()
    await nextTick()

    expect(w.text()).toContain('コホート定義')
  })
})
