import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CharacterizationCanvasToolbar from '@/components/characterization/CharacterizationCanvasToolbar.vue'

const vuetify = createVuetify({ components, directives })

const baseProps = () => ({
  mode: 'table1' as const,
  activeRun: null,
  threshold: 0,
  hasResults: true,
})

describe('CharacterizationCanvasToolbar', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('emits update:mode when toggle changes', async () => {
    const w = mount(CharacterizationCanvasToolbar, {
      global: { plugins: [vuetify] }, props: baseProps(),
    })
    await w.find('[data-testid="char-toolbar-mode-perAnalysis"]').trigger('click')
    expect(w.emitted('update:mode')?.[0]).toEqual(['perAnalysis'])
  })

  it('emits open-configure on configure button click', async () => {
    const w = mount(CharacterizationCanvasToolbar, {
      global: { plugins: [vuetify] }, props: baseProps(),
    })
    await w.find('[data-testid="char-toolbar-configure"]').trigger('click')
    expect(w.emitted('open-configure')).toHaveLength(1)
  })

  it('emits export on export button click', async () => {
    const w = mount(CharacterizationCanvasToolbar, {
      global: { plugins: [vuetify] }, props: baseProps(),
    })
    await w.find('[data-testid="char-toolbar-export"]').trigger('click')
    expect(w.emitted('export')).toHaveLength(1)
  })

  it('disables export when no results', () => {
    const w = mount(CharacterizationCanvasToolbar, {
      global: { plugins: [vuetify] }, props: { ...baseProps(), hasResults: false },
    })
    const btn = w.find('[data-testid="char-toolbar-export"]')
    expect(btn.attributes('disabled')).toBeDefined()
  })

  it('shows active run chip when execution is set', () => {
    const w = mount(CharacterizationCanvasToolbar, {
      global: { plugins: [vuetify] },
      props: { ...baseProps(),
        activeRun: { id: 7, sourceKey: 'CCAE', personCount: 2275 } },
    })
    expect(w.text()).toContain('#7')
    expect(w.text()).toContain('CCAE')
  })
})
