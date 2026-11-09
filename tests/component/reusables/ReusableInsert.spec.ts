/**
 * "From Reusable" insertion: the button only appears under an editor that
 * owns a concept set list, the dialog offers reusables of the matching type,
 * parameters can be bound, and the result lands in the host expression with
 * its concept sets renumbered.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, reactive } from 'vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/services/reusable.service', () => ({ listReusables: vi.fn() }))
vi.mock('@/services/concept-set.service', () => ({ getConceptSetById: vi.fn() }))

import { listReusables } from '@/services/reusable.service'
import { getConceptSetById } from '@/services/concept-set.service'
import { success } from '@/types/api'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CensoringCriteriaEditor from '@/components/cohort-editor/end-strategy/CensoringCriteriaEditor.vue'
import ReusableInsertButton from '@/components/reusables/ReusableInsertButton.vue'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import type { ConceptSet, Criteria, CriteriaGroup as CriteriaGroupModel } from '@/models/circe-types'
import type { ConceptSet as AtlasConceptSet } from '@/models/concept-set.types'

const vuetify = createVuetify({ components, directives })

const groupReusable = {
  id: 1,
  name: 'T2DM with drug',
  description: 'Diagnosis plus a drug',
  data: JSON.stringify({
    type: 'CRITERIA_GROUP',
    parameters: [{ id: 1, name: 'Drug', type: 'Concept Set', data: { id: -1, name: 'Drug' } }],
    conceptSets: [{ id: 0, name: 'T2DM', expression: { items: [] } }],
    criteriaGroupExpression: {
      Type: 'ALL',
      CriteriaList: [
        { Criteria: { ConditionOccurrence: { CodesetId: 0 } } },
        { Criteria: { DrugExposure: { CodesetId: -1 } } },
      ],
    },
  }),
}
const eventReusable = {
  id: 2,
  name: 'Acute MI',
  data: JSON.stringify({
    type: 'INITIAL_EVENT',
    conceptSets: [{ id: 0, name: 'MI', expression: { items: [] } }],
    initialEventExpression: { CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }] },
  }),
}

/** Stand-in for the concept set picker: two buttons, one per kind of choice. */
const ConceptSetSelectionDialogStub = defineComponent({
  name: 'ConceptSetSelectionDialog',
  props: { modelValue: Boolean, localConceptSets: { type: Array, default: () => [] } },
  emits: ['local-concept-set-selected', 'concept-set-selected', 'update:modelValue', 'create-new'],
  setup(props, { emit }) {
    return () =>
      props.modelValue
        ? h('div', { 'data-testid': 'cs-picker' }, [
            h('button', {
              'data-testid': 'cs-picker-local',
              onClick: () => emit('local-concept-set-selected', props.localConceptSets[0]),
            }),
            h('button', {
              'data-testid': 'cs-picker-repository',
              onClick: () => emit('concept-set-selected', { id: 77, name: 'Metformin' }),
            }),
          ])
        : null
  },
})

/** An editor that owns a concept set list, the way CohortBuilder does. */
function hostFor(child: () => ReturnType<typeof h>, conceptSets: ConceptSet[], allowReusables = true) {
  return defineComponent({
    setup() {
      useCirceConceptSetPicker({
        getConceptSets: () => conceptSets,
        addConceptSet: cs => conceptSets.push(cs),
        allowReusables,
      })
      return child
    },
  })
}

function mountInHost(component: ReturnType<typeof hostFor>) {
  return mount(component, {
    attachTo: document.body,
    global: {
      plugins: [vuetify],
      stubs: { ConceptSetSelectionDialog: ConceptSetSelectionDialogStub, CriteriaRenderer: true, CorelatedCriteria: true },
    },
  })
}

function query(testId: string) {
  return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null
}

async function click(testId: string) {
  const element = query(testId)
  expect(element, `no element with data-testid=${testId}`).not.toBeNull()
  element!.click()
  await flushPromises()
}

describe('From Reusable insertion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    setActivePinia(createPinia())
    vi.mocked(listReusables).mockResolvedValue(success([groupReusable, eventReusable]))
  })

  it('offers no button outside an editor that owns concept sets', () => {
    const wrapper = mount(ReusableInsertButton, {
      props: { type: 'CRITERIA_GROUP' },
      global: { plugins: [vuetify] },
    })
    expect(wrapper.html()).not.toContain('button')
  })

  it('offers no button where the host opts out, as the reusable editor does', () => {
    const group = reactive<CriteriaGroupModel>({ Type: 'ALL', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), [], false))
    expect(wrapper.find('[data-testid="criteria-group-insert-reusable"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('inserts a criteria group reusable with a parameter bound to one of the host\'s concept sets', async () => {
    const conceptSets = reactive<ConceptSet[]>([{ id: 0, name: 'Host set', expression: { items: [] } }])
    const group = reactive<CriteriaGroupModel>({ Type: 'ANY', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))

    await click('criteria-group-insert-reusable')
    // Only reusables of the matching type are offered.
    expect(query('reusable-insert-pick-1')).not.toBeNull()
    expect(query('reusable-insert-pick-2')).toBeNull()

    await click('reusable-insert-pick-1')
    expect(query('reusable-insert-parameter-1-value')!.textContent).toContain('Any concept')
    await click('reusable-insert-parameter-1-choose')
    await click('cs-picker-local')
    expect(query('reusable-insert-parameter-1-value')!.textContent).toContain('Host set')
    await click('reusable-insert-confirm')

    expect(conceptSets.map(cs => [cs.id, cs.name])).toEqual([
      [0, 'Host set'],
      [1, 'T2DM'],
    ])
    expect(group.Type).toBe('ALL')
    expect(group.CriteriaList?.map(c => c.Criteria)).toEqual([
      { ConditionOccurrence: { CodesetId: 1 } },
      { DrugExposure: { CodesetId: 0 } },
    ])
    wrapper.unmount()
  })

  it('adds a repository concept set chosen for a parameter', async () => {
    vi.mocked(getConceptSetById).mockResolvedValue({
      id: 77,
      name: 'Metformin',
      items: [{ conceptId: 1503297, conceptName: 'metformin', isExcluded: false, includeDescendants: true, includeMapped: false }],
    } as unknown as AtlasConceptSet)
    const conceptSets = reactive<ConceptSet[]>([])
    const existing = { Criteria: { Death: {} } }
    const group = reactive<CriteriaGroupModel>({ Type: 'ANY', CriteriaList: [existing] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))

    await click('criteria-group-insert-reusable')
    await click('reusable-insert-pick-1')
    await click('reusable-insert-parameter-1-choose')
    await click('cs-picker-repository')
    await click('reusable-insert-confirm')

    expect(getConceptSetById).toHaveBeenCalledWith(77)
    expect(conceptSets.map(cs => [cs.id, cs.name])).toEqual([
      [0, 'T2DM'],
      [1, 'Metformin'],
    ])
    expect(conceptSets[1].expression?.items?.[0].concept?.CONCEPT_ID).toBe(1503297)
    // The group already had criteria, so the reusable arrives as a nested group.
    expect(group.Type).toBe('ANY')
    expect(group.CriteriaList).toEqual([existing])
    expect(group.Groups?.[0].CriteriaList?.[1].Criteria).toEqual({ DrugExposure: { CodesetId: 1 } })
    wrapper.unmount()
  })

  it('appends an Initial/Censoring Event reusable to the censoring events', async () => {
    const conceptSets = reactive<ConceptSet[]>([{ id: 0, name: 'Host', expression: { items: [] } }])
    const onUpdate = vi.fn()
    const existing: Criteria = { Death: {} }
    const wrapper = mountInHost(
      hostFor(
        () =>
          h(CensoringCriteriaEditor, {
            modelValue: [existing],
            conceptSets: [],
            'onUpdate:modelValue': onUpdate,
          }),
        conceptSets
      )
    )

    await click('censoring-insert-reusable')
    expect(query('reusable-insert-pick-1')).toBeNull()
    await click('reusable-insert-pick-2')
    await click('reusable-insert-confirm')

    expect(conceptSets.map(cs => cs.name)).toEqual(['Host', 'MI'])
    expect(onUpdate).toHaveBeenCalledWith([existing, { ConditionOccurrence: { CodesetId: 1 } }])
    wrapper.unmount()
  })

  it('goes back to the list and inserts nothing on cancel', async () => {
    const conceptSets = reactive<ConceptSet[]>([])
    const group = reactive<CriteriaGroupModel>({ Type: 'ALL', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))

    await click('criteria-group-insert-reusable')
    await click('reusable-insert-pick-1')
    await click('reusable-insert-back')
    expect(query('reusable-insert-table')).not.toBeNull()
    expect((query('reusable-insert-confirm') as HTMLButtonElement).disabled).toBe(true)

    expect(conceptSets).toEqual([])
    expect(group.CriteriaList).toEqual([])
    wrapper.unmount()
  })
})

