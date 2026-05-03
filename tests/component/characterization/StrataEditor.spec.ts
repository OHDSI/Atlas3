/**
 * StrataEditor component tests
 *
 * Confirm add/remove flows emit updates and that the criteria-edit dialog
 * forwards CriteriaGroup updates back to the model.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import StrataEditor from '@/components/characterization/StrataEditor.vue'
import type { Stratum } from '@/models/characterization.types'
import type { CriteriaGroup } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountEditor(initial: Stratum[] = []) {
  return mount(StrataEditor, {
    props: {
      modelValue: initial,
      'onUpdate:modelValue': (value: Stratum[]) => {
        wrapper.setProps({ modelValue: value })
      },
    },
    global: {
      plugins: [vuetify],
      stubs: {
        CriteriaGroupEditor: true,
        AtlasDialog: {
          name: 'AtlasDialog',
          template: '<div><slot /><slot name="actions" /></div>',
        },
        ConceptSetSelectionDialog: true,
        ConceptSearchDialog: true,
      },
    },
  })
}

let wrapper: ReturnType<typeof mountEditor>

describe('StrataEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders empty placeholder when no strata are provided', () => {
    wrapper = mountEditor([])
    expect(wrapper.find('[data-testid="strata-editor-empty"]').exists()).toBe(true)
  })

  it('emits a new stratum with a UUID id and a default CriteriaGroup when Add is clicked', async () => {
    wrapper = mountEditor([])

    await wrapper.get('[data-testid="strata-editor-add"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next).toHaveLength(1)
    expect(typeof next[0]!.id).toBe('string')
    expect(next[0]!.id.length).toBeGreaterThan(0)
    expect(next[0]!.name).toBe('')
    const criteria = next[0]!.criteria as CriteriaGroup
    expect(criteria.logicType).toBe('ALL')
    expect(criteria.events).toEqual([])
  })

  it('removing a stratum filters it out of the modelValue', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: {} },
      { id: 'b', name: 'B', criteria: {} },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-remove-0"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next).toHaveLength(1)
    expect(next[0]!.id).toBe('b')
  })

  it('forwards CriteriaGroupEditor update:modelValue back into the stratum', async () => {
    const group: CriteriaGroup = { id: 'g1', logicType: 'ALL', events: [] }
    const initial: Stratum[] = [{ id: 'a', name: 'A', criteria: group }]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await flushPromises()

    const editor = wrapper.findComponent({ name: 'CriteriaGroupEditor' })
    expect(editor.exists()).toBe(true)
    const nextGroup: CriteriaGroup = { id: 'g1', logicType: 'ANY', events: [] }
    await editor.vm.$emit('update:modelValue', nextGroup)
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect((next[0]!.criteria as CriteriaGroup).logicType).toBe('ANY')
  })
})
