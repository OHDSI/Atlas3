import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import HighlightColorPicker from '@/components/profile/HighlightColorPicker.vue'
import { HIGHLIGHT_PALETTE } from '@/models/profile.types'

const vuetify = createVuetify({ components, directives })

describe('HighlightColorPicker', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders 6 swatches and emits selected color', async () => {
    const w = mount(HighlightColorPicker, { global: { plugins: [vuetify] } })
    const swatches = w.findAll('[data-test="highlight-swatch"]')
    expect(swatches.length).toBe(HIGHLIGHT_PALETTE.length)
    await swatches[0]!.trigger('click')
    expect(w.emitted('select')?.[0]?.[0]).toBe(HIGHLIGHT_PALETTE[0])
  })

  it('emits clear event from clear button', async () => {
    const w = mount(HighlightColorPicker, { global: { plugins: [vuetify] } })
    await w.find('[data-test="highlight-clear"]').trigger('click')
    expect(w.emitted('clear')?.length).toBe(1)
  })
})
