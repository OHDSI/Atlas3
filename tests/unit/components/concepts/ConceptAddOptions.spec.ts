import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptAddOptions from '@/components/concepts/ConceptAddOptions.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const NONE = { isExcluded: false, includeDescendants: false, includeMapped: false }

function mountOptions(props: Record<string, unknown> = {}) {
  return mount(ConceptAddOptions, {
    global: { plugins: [vuetify] },
    props: { modelValue: NONE, selectedCount: 0, ...props },
  })
}

function checkbox(wrapper: ReturnType<typeof mountOptions>, testid: string) {
  return wrapper.find(`[data-testid="${testid}"] input`)
}

describe('ConceptAddOptions', () => {
  it('renders the three Atlas add-box toggles', () => {
    const wrapper = mountOptions()
    expect(wrapper.find('[data-testid="add-option-descendants"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-option-mapped"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-option-exclude"]').exists()).toBe(true)
  })

  it('reflects the incoming flags', () => {
    const wrapper = mountOptions({ modelValue: { ...NONE, includeDescendants: true } })
    expect((checkbox(wrapper, 'add-option-descendants').element as HTMLInputElement).checked).toBe(true)
    expect((checkbox(wrapper, 'add-option-exclude').element as HTMLInputElement).checked).toBe(false)
  })

  it('emits the whole flag set when a toggle changes', async () => {
    const wrapper = mountOptions()
    await checkbox(wrapper, 'add-option-exclude').setValue(true)

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      { isExcluded: true, includeDescendants: false, includeMapped: false },
    ])
  })

  it('disables the add button when nothing is selected', () => {
    const wrapper = mountOptions({ selectedCount: 0 })
    expect(wrapper.findComponent({ name: 'AtlasButton' }).props('disabled')).toBe(true)
  })

  it('enables the add button and shows the selection count', () => {
    const wrapper = mountOptions({ selectedCount: 3 })
    const btn = wrapper.findComponent({ name: 'AtlasButton' })
    expect(btn.props('disabled')).toBe(false)
    expect(wrapper.text()).toContain('3')
  })

  it('stays disabled while the caller reports itself busy', () => {
    const wrapper = mountOptions({ selectedCount: 3, disabled: true })
    expect(wrapper.findComponent({ name: 'AtlasButton' }).props('disabled')).toBe(true)
  })

  it('emits add when the button is clicked', async () => {
    const wrapper = mountOptions({ selectedCount: 2 })
    await wrapper.find('[data-testid="add-selected"]').trigger('click')
    expect(wrapper.emitted('add')).toHaveLength(1)
  })
})
