/**
 * "From Reusable" insertion: the button only appears under an editor that
 * owns a concept set list, the dialog offers reusables that fit the place,
 * parameters can be bound, and the result lands in the host expression with
 * its concept sets renumbered. Reusables without parameters arrive by
 * reference: stamped with `ReusableRef`, shown read-only, and updatable or
 * detachable from the banner above them.
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
vi.mock('@/services/reusable.service', () => ({ listReusables: vi.fn(), getReusable: vi.fn() }))
vi.mock('@/services/reusable-versions.service', () => ({ getReusableVersions: vi.fn() }))
vi.mock('@/services/concept-set.service', () => ({ getConceptSetById: vi.fn() }))

import { getReusable, listReusables } from '@/services/reusable.service'
import { getReusableVersions } from '@/services/reusable-versions.service'
import { clearReusableReferenceCache } from '@/components/reusables/reusable-reference'
import { getConceptSetById } from '@/services/concept-set.service'
import { success } from '@/types/api'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
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

const plainGroupReusable = {
  id: 3,
  name: 'Prior metformin',
  data: JSON.stringify({
    type: 'CRITERIA_GROUP',
    conceptSets: [{ id: 0, name: 'Metformin', expression: { items: [] } }],
    criteriaGroupExpression: {
      Type: 'ANY',
      CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0 } } }],
    },
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
    clearReusableReferenceCache()
    vi.mocked(listReusables).mockResolvedValue(success([groupReusable, eventReusable, plainGroupReusable]))
    // Two saved versions, so the current state is version 3.
    vi.mocked(getReusableVersions).mockResolvedValue([
      { version: 1, assetId: 0, createdDate: 0, archived: false },
      { version: 2, assetId: 0, createdDate: 0, archived: false },
    ])
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
    // Group reusables, and the single-event reusable, fit a criteria group.
    expect(query('reusable-insert-pick-1')).not.toBeNull()
    expect(query('reusable-insert-pick-2')).not.toBeNull()

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
    expect(onUpdate).toHaveBeenCalledWith([
      existing,
      {
        ConditionOccurrence: {
          CodesetId: 1,
          ReusableRef: { Id: 2, Version: 3, Name: 'Acute MI' },
        },
      },
    ])
    wrapper.unmount()
  })

  it('inserts a reusable without parameters by reference, as its own nested group', async () => {
    const conceptSets = reactive<ConceptSet[]>([])
    const group = reactive<CriteriaGroupModel>({ Type: 'ALL', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))

    await click('criteria-group-insert-reusable')
    await click('reusable-insert-pick-3')
    expect(query('reusable-insert-mode')!.textContent).toContain('Inserted as a reference')
    await click('reusable-insert-confirm')

    // Even into an empty group, so the reference stays one unit.
    expect(group.CriteriaList).toEqual([])
    expect(JSON.parse(JSON.stringify(group.Groups))).toEqual([
      {
        Type: 'ANY',
        CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0 } } }],
        DemographicCriteriaList: [],
        Groups: [],
        ReusableRef: { Id: 3, Version: 3, Name: 'Prior metformin' },
      },
    ])
    expect(conceptSets.map(cs => [cs.id, cs.name])).toEqual([[0, 'Metformin']])
    wrapper.unmount()
  })

  it('inserts a parameterized reusable as a copy and says why', async () => {
    const group = reactive<CriteriaGroupModel>({ Type: 'ALL', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), []))

    await click('criteria-group-insert-reusable')
    await click('reusable-insert-pick-1')
    expect(query('reusable-insert-mode')!.textContent).toContain('This reusable has parameters')
    await click('reusable-insert-confirm')

    expect(getReusableVersions).not.toHaveBeenCalled()
    expect(group.ReusableRef).toBeUndefined()
    expect(JSON.stringify(group)).not.toContain('ReusableRef')
    wrapper.unmount()
  })

  it('adds a single-event reusable to a group as one criterion with a default window', async () => {
    const conceptSets = reactive<ConceptSet[]>([])
    const group = reactive<CriteriaGroupModel>({ Type: 'ALL', CriteriaList: [] })
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))

    await click('criteria-group-insert-reusable')
    await click('reusable-insert-pick-2')
    await click('reusable-insert-confirm')

    expect(group.CriteriaList).toHaveLength(1)
    const inserted = group.CriteriaList![0]
    expect(inserted.Criteria).toEqual({
      ConditionOccurrence: { CodesetId: 0, ReusableRef: { Id: 2, Version: 3, Name: 'Acute MI' } },
    })
    expect(inserted.Occurrence).toEqual({ Type: 2, Count: 1 })
    expect(inserted.StartWindow).toBeDefined()
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

describe('Referenced logic in a criteria group', () => {
  const referencedGroup = () =>
    reactive<CriteriaGroupModel>({
      Type: 'ALL',
      CriteriaList: [],
      Groups: [
        {
          Type: 'ANY',
          CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0 } } }],
          ReusableRef: { Id: 3, Version: 2, Name: 'Prior metformin' },
        },
      ],
    })

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    setActivePinia(createPinia())
    clearReusableReferenceCache()
    vi.mocked(getReusableVersions).mockResolvedValue([
      { version: 1, assetId: 3, createdDate: 0, archived: false },
      { version: 2, assetId: 3, createdDate: 0, archived: false },
    ])
    // Version 3 adds a second criterion and keeps the concept set unchanged.
    vi.mocked(getReusable).mockResolvedValue(
      success({
        ...plainGroupReusable,
        data: JSON.stringify({
          type: 'CRITERIA_GROUP',
          conceptSets: [{ id: 0, name: 'Metformin', expression: { items: [] } }],
          criteriaGroupExpression: {
            Type: 'ANY',
            CriteriaList: [
              { Criteria: { DrugExposure: { CodesetId: 0 } } },
              { Criteria: { DrugEra: { CodesetId: 0 } } },
            ],
          },
        }),
      })
    )
  })

  it('shows the source, keeps the logic read-only and offers the newer version', async () => {
    const group = referencedGroup()
    const wrapper = mountInHost(
      hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), [
        { id: 0, name: 'Metformin', expression: { items: [] } },
      ])
    )
    await flushPromises()

    expect(query('reusable-ref-link')!.textContent).toContain('Prior metformin')
    expect(query('reusable-ref-version')!.textContent).toContain('v2')
    expect(query('criteria-group-readonly')!.hasAttribute('inert')).toBe(true)
    expect(query('reusable-ref-update-available')).not.toBeNull()
    wrapper.unmount()
  })

  it('updates to the newer version in place, reusing the identical concept set', async () => {
    const group = referencedGroup()
    const conceptSets = reactive<ConceptSet[]>([{ id: 0, name: 'Metformin', expression: { items: [] } }])
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), conceptSets))
    await flushPromises()

    await click('reusable-ref-update')

    // Compared as saved JSON: absent fields the update walked over stay absent.
    expect(JSON.parse(JSON.stringify(group.Groups))).toEqual([
      {
        Type: 'ANY',
        CriteriaList: [
          { Criteria: { DrugExposure: { CodesetId: 0 } } },
          { Criteria: { DrugEra: { CodesetId: 0 } } },
        ],
        DemographicCriteriaList: [],
        Groups: [],
        ReusableRef: { Id: 3, Version: 3, Name: 'Prior metformin' },
      },
    ])
    expect(conceptSets).toHaveLength(1)
    wrapper.unmount()
  })

  it('detaches into a plain, editable copy with the same logic', async () => {
    const group = referencedGroup()
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), []))
    await flushPromises()

    await click('reusable-ref-detach')

    expect(group.Groups).toEqual([
      { Type: 'ANY', CriteriaList: [{ Criteria: { DrugExposure: { CodesetId: 0 } } }] },
    ])
    expect(query('reusable-ref-banner')).toBeNull()
    expect(query('criteria-group-readonly')).toBeNull()
    wrapper.unmount()
  })

  it('says so when the reusable can no longer be read', async () => {
    vi.mocked(getReusable).mockResolvedValue({ success: false, error: new Error('gone') } as never)
    const group = referencedGroup()
    const wrapper = mountInHost(hostFor(() => h(CriteriaGroup, { group, conceptSets: [] }), []))
    await flushPromises()

    expect(query('reusable-ref-missing')).not.toBeNull()
    expect(query('reusable-ref-update')).toBeNull()
    wrapper.unmount()
  })

  it('shows a referenced event read-only, with detach and remove on the banner', async () => {
    const criteria = reactive<Criteria>({
      ConditionOccurrence: { CodesetId: 0, ReusableRef: { Id: 2, Version: 3, Name: 'Acute MI' } },
    })
    const onRemove = vi.fn()
    const wrapper = mount(
      hostFor(() => h(CriteriaRenderer, { criteria, conceptSets: [], onRemove }), []),
      { attachTo: document.body, global: { plugins: [vuetify], stubs: { ConditionOccurrence: true } } }
    )
    await flushPromises()

    expect(query('criteria-reference')).not.toBeNull()
    expect(document.body.querySelector('.criteria-renderer__readonly')!.hasAttribute('inert')).toBe(true)

    await click('reusable-ref-remove')
    expect(onRemove).toHaveBeenCalled()

    await click('reusable-ref-detach')
    expect(criteria).toEqual({ ConditionOccurrence: { CodesetId: 0 } })
    expect(query('criteria-reference')).toBeNull()
    wrapper.unmount()
  })
})
