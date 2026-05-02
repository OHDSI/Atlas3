import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import PathwayCanvasToolbar from '@/components/pathway/PathwayCanvasToolbar.vue'

const vuetify = createVuetify({ components, directives })

const baseProps = {
  mode: 'visual' as const,
  activeRun: { id: 4231, sourceKey: 'SYNPUF', age: '2h ago' },
  coverage: { totalPathwaysCount: 5824, targetCohortCount: 12901 },
}

function mountIt(props: Partial<typeof baseProps> = {}) {
  return mount(PathwayCanvasToolbar, {
    props: { ...baseProps, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('PathwayCanvasToolbar', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders the active run pill', () => {
    const w = mountIt()
    expect(w.text()).toContain('#4231')
    expect(w.text()).toContain('SYNPUF')
  })

  it('renders the coverage pill', () => {
    const w = mountIt()
    expect(w.text()).toContain('5,824')
    expect(w.text()).toContain('12,901')
    expect(w.text()).toMatch(/45\.1%/)
  })

  it('renders an empty state pill when activeRun is null', () => {
    const w = mountIt({ activeRun: null })
    expect(w.text()).toMatch(/No runs yet/i)
  })

  it('emits update:mode when the toggle is clicked', async () => {
    const w = mountIt()
    const tabular = w.find('[data-testid="toolbar-mode-tabular"]')
    await tabular.trigger('click')
    expect(w.emitted()['update:mode']?.[0]).toEqual(['tabular'])
  })
})
