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
import type { CriteriaGroup } from '@/components/cohort-editor/circe.types'

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
        CriteriaGroup: {
          name: 'CriteriaGroup',
          props: ['group'],
          template:
            '<button data-testid="criteria-group-mutate" @click="group.Type = \'MUTATED\'; group.CriteriaList = [{ Type: \'ATOMIC\', ConceptSets: [], Codesets: [], ExitCriteria: null, InclusionRules: [] }]">mutate</button>',
        },
        AtlasDialog: {
          name: 'AtlasDialog',
          template: '<div><slot /><slot name="actions" /></div>',
        },
        ConceptSetSelectionDialog: true,
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

  it('emits a new stratum with a UUID id and a default circe CriteriaGroup when Add is clicked', async () => {
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
    expect(criteria.Type).toBe('ALL')
    expect(criteria.CriteriaList).toEqual([])
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

  it('closes the dialog and emits updated criteria when close button is clicked', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: { Type: 'ALL', CriteriaList: [] } },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await flushPromises()

    // Trigger close via the dialog close action button
    const closeBtn = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('close'))
    if (closeBtn) {
      await closeBtn.trigger('click')
      await flushPromises()
    }

    // After close, an update should have been emitted
    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as Stratum[]
    expect(next[0]!.criteria).toBeDefined()
  })

  it('keeps each stratum criteria isolated across dialog opens', async () => {
    const initial: Stratum[] = [
      {
        id: 'a',
        name: 'A',
        criteria: {
          Type: 'ALL',
          CriteriaList: [{ Type: 'ATOMIC', ConceptSets: [], Codesets: [], ExitCriteria: null, InclusionRules: [] }],
        },
      },
      {
        id: 'b',
        name: 'B',
        criteria: {
          Type: 'ANY',
          CriteriaList: [
            { Type: 'ATOMIC', ConceptSets: [], Codesets: [], ExitCriteria: null, InclusionRules: [] },
            { Type: 'ATOMIC', ConceptSets: [], Codesets: [], ExitCriteria: null, InclusionRules: [] },
          ],
        },
      },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="criteria-group-mutate"]').trigger('click')
    const closeBtn = wrapper.findAll('button').find(b => b.text().toLowerCase().includes('close'))
    if (closeBtn) {
      await closeBtn.trigger('click')
    }
    await flushPromises()

    await wrapper.get('[data-testid="strata-editor-edit-criteria-1"]').trigger('click')
    await flushPromises()

    const strata = wrapper.props('modelValue') as Stratum[]
    expect(strata[0]!.criteria).toMatchObject({
      Type: 'MUTATED',
      CriteriaList: [{ Type: 'ATOMIC' }],
    })
    expect(strata[1]!.criteria).toMatchObject({
      Type: 'ANY',
      CriteriaList: expect.any(Array),
    })
    expect((strata[1]!.criteria as CriteriaGroup).CriteriaList).toHaveLength(2)
  })
})
