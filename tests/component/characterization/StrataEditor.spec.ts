/**
 * StrataEditor component tests
 *
 * Confirm add/remove flows emit updates and that the criteria-edit dialog
 * forwards CriteriaGroup updates back to the model.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import StrataEditor from '@/components/characterization/StrataEditor.vue'
import { useCriteriaSelection } from '@/composables/useCriteriaSelection'
import type { Stratum } from '@/models/characterization.types'
import type { CriteriaGroup } from '@/models/circe-types'
import type { ConceptSet } from '@/models/circe-types'

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

function mountEditor(
  initial: Stratum[] = [],
  strataConceptSets: ConceptSet[] = [],
  stubOverrides: Record<string, unknown> = {},
) {
  return mount(StrataEditor, {
    props: {
      modelValue: initial,
      strataConceptSets,
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
        VNavigationDrawer: {
          name: 'VNavigationDrawer',
          props: ['modelValue', 'location', 'temporary', 'width', 'scrim'],
          template: '<div><slot /></div>',
        },
        AtlasDialog: {
          name: 'AtlasDialog',
          props: ['modelValue'],
          template: '<div><slot /><slot v-if="modelValue" name="actions" /></div>',
        },
        ConceptSetSelectionDialog: true,
        ...stubOverrides,
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

  it('updates subgroup-only mode and subgroup names', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: {} },
      { id: 'b', name: 'B', criteria: {} },
    ]
    wrapper = mountEditor(initial)

    await wrapper.findComponent({ name: 'AtlasSwitch' }).vm.$emit('update:modelValue', true)
    ;(wrapper.vm as any).$.setupState.updateName(0, 'Renamed')

    expect(wrapper.emitted('update:strataOnly')).toEqual([[true]])
    expect(wrapper.emitted('update:modelValue')).toContainEqual([
      expect.arrayContaining([expect.objectContaining({ id: 'a', name: 'Renamed' })]),
    ])
  })

  it('adds and updates subgroup concept sets through the embedded editor flow', () => {
    wrapper = mountEditor([])
    const setupState = (wrapper.vm as any).$.setupState

    setupState.handleConceptSetApplied({ name: 'New set', items: [] })
    setupState.handleConceptSetApplied({ id: 0, name: 'Updated set', items: [] })

    const emitted = wrapper.emitted('update:strataConceptSets')
    expect(emitted).toHaveLength(2)
    expect((emitted![0]![0] as any[])[0]).toMatchObject({ id: 0 })
    expect((emitted![1]![0] as any[])[0]).toMatchObject({ id: 0, name: 'Updated set' })
  })

  it('validates subgroup names and summarizes criteria counts', () => {
    wrapper = mountEditor([
      { id: 'empty', name: '', criteria: {} },
      { id: 'first', name: 'Repeated', criteria: { CriteriaList: [{}] } },
      { id: 'second', name: 'Repeated', criteria: { DemographicCriteriaList: [{}, {}] } },
    ])
    const setupState = (wrapper.vm as any).$.setupState

    expect(setupState.nameErrors('')).toHaveLength(1)
    expect(setupState.nameErrors('Repeated')).toHaveLength(1)
    expect(setupState.nameErrors('Unique')).toEqual([])
    expect(setupState.criteriaSummary({ criteria: null })).toBe('No criteria')
    expect(setupState.criteriaSummary({ criteria: { CriteriaList: [{}] } })).toBe('1 event')
    expect(setupState.criteriaSummary({ criteria: { DemographicCriteriaList: [{}, {}] } })).toBe('2 events')
  })

  it('closes an unchanged drawer and ignores criteria edits without a concept-set target', () => {
    wrapper = mountEditor([{ id: 'a', name: 'A', criteria: { Type: 'ALL', CriteriaList: [] } }])
    const setupState = (wrapper.vm as any).$.setupState

    setupState.openCriteriaDialog('a')
    setupState.onDrawerModelValue(false)
    setupState.handleCriteriaEditConceptSet()
    setupState.handleCriteriaEditConceptSet({ targetRef: { value: null } })

    expect(setupState.drawerOpen).toBe(false)
    expect(setupState.editingStratumId).toBeNull()
  })

  it('opens and closes the embedded concept-set editor for an existing concept set', () => {
    const conceptSet: ConceptSet = { id: 9, name: 'Existing', expression: { items: [] } }
    wrapper = mountEditor([], [conceptSet])
    const setupState = (wrapper.vm as any).$.setupState

    setupState.handleCreateNewConceptSet()
    expect(setupState.conceptSetsStore.editorOpen).toBe(true)

    setupState.onConceptSetEditorVisibilityChange(false)
    expect(setupState.conceptSetsStore.editorOpen).toBe(false)

    setupState.handleCriteriaEditConceptSet({ targetRef: { value: 9 } })
    expect(setupState.conceptSetsStore.currentSet).toMatchObject({ id: 9, name: 'Existing' })
  })

  it('applies edited criteria when Apply is clicked', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: { Type: 'ALL', CriteriaList: [] } },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await flushPromises()

    await wrapper.get('[data-testid="strata-editor-apply-criteria"]').trigger('click')
    await flushPromises()

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
    await wrapper.get('[data-testid="strata-editor-apply-criteria"]').trigger('click')
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

  it('requires confirmation before discarding changed criteria', async () => {
    const initial: Stratum[] = [
      { id: 'a', name: 'A', criteria: { Type: 'ALL', CriteriaList: [] } },
    ]
    wrapper = mountEditor(initial)

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await wrapper.get('[data-testid="criteria-group-mutate"]').trigger('click')
    await wrapper.get('[data-testid="strata-editor-cancel-criteria"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('[data-testid="strata-editor-discard-criteria"]').exists()).toBe(true)

    await wrapper.get('[data-testid="strata-editor-discard-criteria"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(initial[0]!.criteria).toMatchObject({ Type: 'ALL', CriteriaList: [] })
  })

  it('opens the concept search dialog when a criteria attribute requests concepts', async () => {
    const onSelect = vi.fn()
    const CriteriaGroupStub = defineComponent({
      name: 'CriteriaGroup',
      props: { group: { type: Object, required: true } },
      setup() {
        const selection = useCriteriaSelection()
        return () =>
          h('button', {
            'data-testid': 'criteria-group-request-concepts',
            onClick: () => selection?.requestConcepts('Gender', onSelect),
          })
      },
    })
    wrapper = mountEditor(
      [{ id: 'a', name: 'A', criteria: { Type: 'ALL', CriteriaList: [] } }],
      [],
      { CriteriaGroup: CriteriaGroupStub, ConceptSearchDialog: true },
    )

    await wrapper.get('[data-testid="strata-editor-edit-criteria-0"]').trigger('click')
    await wrapper.get('[data-testid="criteria-group-request-concepts"]').trigger('click')

    const dialog = wrapper.findComponent({ name: 'ConceptSearchDialog' })
    expect(dialog.props('modelValue')).toBe(true)
    expect(dialog.props('domainFilter')).toBe('Gender')

    dialog.vm.$emit('concepts-selected', [{ conceptId: 8507, conceptName: 'MALE' }])
    await flushPromises()

    expect(onSelect).toHaveBeenCalledWith([expect.objectContaining({ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' })])
    expect(dialog.props('modelValue')).toBe(false)
  })
})
