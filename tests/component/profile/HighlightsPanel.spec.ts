import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightsPanel from '@/components/profile/HighlightsPanel.vue'
import { useProfileStore } from '@/stores/profile'

const vuetify = createVuetify({ components, directives })

function mountPanel() {
  return mount(HighlightsPanel, {
    global: {
      plugins: [vuetify],
    },
  })
}

describe('HighlightsPanel', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the HIGHLIGHT eyebrow', () => {
    useProfileStore()
    const w = mountPanel()
    expect(w.text().toUpperCase()).toContain('HIGHLIGHT')
  })

  it('renders both concepts and sets tabs', () => {
    useProfileStore()
    const w = mountPanel()
    expect(w.find('[data-test="highlights-tab-concepts"]').exists()).toBe(true)
    expect(w.find('[data-test="highlights-tab-sets"]').exists()).toBe(true)
  })

  it('disables concept-sets tab when no cohort context', () => {
    useProfileStore()
    const w = mountPanel()
    expect(w.find('[data-test="highlights-tab-sets"]').attributes('disabled')).toBeDefined()
  })

  it('clear-all click invokes store.clearHighlights', async () => {
    const s = useProfileStore()
    s.applyHighlight([1], '#a6cee3')
    expect(s.highlights.size).toBe(1)
    const w = mountPanel()
    await w.find('[data-test="highlight-clear-all"]').trigger('click')
    expect(s.highlights.size).toBe(0)
  })
})
