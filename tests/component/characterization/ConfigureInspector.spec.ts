import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConfigureInspector from '@/components/characterization/ConfigureInspector.vue'
import { DEFAULT_TABLE1_CONFIG } from '@/models/characterization.types'

const vuetify = createVuetify({ components, directives })
const baseProps = () => ({
  open: true,
  config: { ...DEFAULT_TABLE1_CONFIG },
  cohortCount: 2,
  hasStrata: true,
})

describe('ConfigureInspector', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('does not render when closed', () => {
    const w = mount(ConfigureInspector, {
      global: { plugins: [vuetify] },
      props: { ...baseProps(), open: false },
    })
    expect(w.find('[data-testid="configure-inspector"]').exists()).toBe(false)
  })

  it('emits update:config when binary format changes', async () => {
    const w = mount(ConfigureInspector, {
      global: { plugins: [vuetify] },
      props: baseProps(),
    })
    const sel = w.findComponent({ name: 'VSelect' })
    await sel.vm.$emit('update:modelValue', 'pct')
    const evt = w.emitted('update:config')
    expect(evt).toBeTruthy()
    expect((evt![0]![0] as { binaryFormat: string }).binaryFormat).toBe('pct')
  })

  it('disables Std Diff toggle when cohortCount !== 2', () => {
    const w = mount(ConfigureInspector, {
      global: { plugins: [vuetify] },
      props: { ...baseProps(), cohortCount: 1 },
    })
    const tgl = w.find('[data-testid="configure-stddiff"] input')
    expect((tgl.element as HTMLInputElement).disabled).toBe(true)
  })

  it('disables Strata-as-cols when hasStrata is false', () => {
    const w = mount(ConfigureInspector, {
      global: { plugins: [vuetify] },
      props: { ...baseProps(), hasStrata: false },
    })
    const tgl = w.find('[data-testid="configure-strata-as-cols"] input')
    expect((tgl.element as HTMLInputElement).disabled).toBe(true)
  })

  it('emits close when × is clicked', async () => {
    const w = mount(ConfigureInspector, {
      global: { plugins: [vuetify] },
      props: baseProps(),
    })
    await w.find('[data-testid="configure-close"]').trigger('click')
    expect(w.emitted('close')).toHaveLength(1)
  })
})
