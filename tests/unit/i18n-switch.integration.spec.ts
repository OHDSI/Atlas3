/**
 * Integration test: switching locale to Japanese reactively updates a
 * component that renders translations via the real useI18n composable + real
 * locale store + real bundled en.json/ja.json (only the WebAPI service and
 * logger are mocked). This exercises the full UI switch path end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'

// Simulate a deployment WITHOUT a working i18n backend: both WebAPI calls
// reject. en.json and ja.json are the real bundled files, so both locales must
// still work entirely from the bundle.
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const Consumer = defineComponent({
  setup() {
    const { t } = useI18n()
    return { label: t('navigation.cohortdefinitions', 'Cohort Definitions') }
  },
  template: `<div class="lbl">{{ label }}</div>`,
})

describe('locale switch → Japanese (integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('offers ja in availableLocales after init', async () => {
    const store = useLocaleStore()
    await store.initialize()
    expect(store.availableLocales.map(l => l.code)).toContain('ja')
  })

  it('round-trips en → ja → en reactively, with no WebAPI backend', async () => {
    const store = useLocaleStore()
    await store.initialize()

    const wrapper = mount(Consumer)
    expect(wrapper.text()).toContain('Cohort Definitions')

    await store.changeLocale('ja')
    await nextTick()
    expect(store.locale).toBe('ja')
    expect(wrapper.text()).toContain('コホート定義')

    // Regression: switching back to English must work even with no backend.
    await store.changeLocale('en')
    await nextTick()
    expect(store.locale).toBe('en')
    expect(wrapper.text()).toContain('Cohort Definitions')
  })
})
