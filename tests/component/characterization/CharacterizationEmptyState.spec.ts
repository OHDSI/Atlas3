import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationEmptyState from '@/components/characterization/CharacterizationEmptyState.vue'

const vuetify = createVuetify({ components, directives })

describe('CharacterizationEmptyState', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders no-id variant', () => {
    const w = mount(CharacterizationEmptyState, {
      global: { plugins: [vuetify] }, props: { variant: 'no-id' },
    })
    expect(w.text().toLowerCase()).toContain('save the design')
  })

  it('renders no-runs variant with run button', async () => {
    const w = mount(CharacterizationEmptyState, {
      global: { plugins: [vuetify] }, props: { variant: 'no-runs' },
    })
    const btn = w.find('[data-testid="char-empty-run"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(w.emitted('run')).toHaveLength(1)
  })

  it('renders the results-error variant with the server message (#291)', () => {
    const w = mount(CharacterizationEmptyState, {
      global: { plugins: [vuetify] },
      props: {
        variant: 'results-error',
        errorMessage: 'An exception occurred: java.lang.IllegalArgumentException',
      },
    })
    expect(w.text().toLowerCase()).toContain('could not be loaded')
    expect(w.text()).toContain('An exception occurred: java.lang.IllegalArgumentException')
  })

  it('renders no-data variant', () => {
    const w = mount(CharacterizationEmptyState, {
      global: { plugins: [vuetify] }, props: { variant: 'no-data' },
    })
    expect(w.text().toLowerCase()).toMatch(/no rows match/)
  })
})
