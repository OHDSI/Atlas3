/**
 * RecommendTab — the "recommendations unavailable" notice.
 *
 * Atlas 2.15 showed the same notice on a 501 from the recommend endpoint and
 * linked to the OHDSI forum thread explaining how to install the PHOEBE 2.0
 * tables. Without that link the user learns what is wrong but not how to fix
 * it (#155).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import RecommendTab from '@/components/concepts/RecommendTab.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountTab() {
  return mount(RecommendTab, {
    global: {
      plugins: [vuetify],
      provide: { sourceKey: { value: 'SYNPUF1K' } },
    },
  })
}

describe('RecommendTab unavailable notice (#155)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('links to the PHOEBE 2.0 setup instructions when recommendations are unavailable', () => {
    const store = useConceptSetsStore()
    store.isRecommendedAvailable = false

    const wrapper = mountTab()
    const notice = wrapper.find('[data-testid="recommend-not-available"]')
    expect(notice.exists()).toBe(true)

    const link = wrapper.find('[data-testid="recommend-setup-link"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('https://forums.ohdsi.org/t/phoebe-2-0/17410')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('shows neither the notice nor the link while recommendations are available', () => {
    const store = useConceptSetsStore()
    store.isRecommendedAvailable = true

    const wrapper = mountTab()
    expect(wrapper.find('[data-testid="recommend-not-available"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="recommend-setup-link"]').exists()).toBe(false)
  })
})
