import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { pristinePinia, vuetify } from './_test-helpers'
import IncidenceRateStratifyRuleEditor from '@/components/incidence-rate/IncidenceRateStratifyRuleEditor.vue'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSet } from '@/models/circe-types'
import type { StratifyRule } from '@/models/incidence-rate.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const rule: StratifyRule = {
  name: 'Age band',
  description: 'Initial description',
  expression: { Type: 'ALL', CriteriaList: [] },
}

function mountEditor(conceptSets: ConceptSet[] = []) {
  return mount(IncidenceRateStratifyRuleEditor, {
    props: { rule: structuredClone(rule), conceptSets },
    global: {
      plugins: [pristinePinia(), vuetify],
      stubs: {
        CriteriaGroup: {
          name: 'CriteriaGroup',
          props: ['group'],
          template: '<button data-testid="mutate-criteria" @click="group.Type = \'ANY\'">mutate</button>',
        },
        ConceptSetSelectionDialog: true,
        ConceptSetEditor: true,
      },
    },
  })
}

describe('IncidenceRateStratifyRuleEditor', () => {
  beforeEach(() => pristinePinia())

  it('edits the inspector-owned draft rule directly', async () => {
    const wrapper = mountEditor()
    const fields = wrapper.findAllComponents({ name: 'AtlasTextField' })

    await fields[0]!.vm.$emit('update:modelValue', 'Renamed rule')
    await fields[1]!.vm.$emit('update:modelValue', 'Updated description')
    await wrapper.get('[data-testid="mutate-criteria"]').trigger('click')

    expect(wrapper.props('rule')).toMatchObject({
      name: 'Renamed rule',
      description: 'Updated description',
      expression: { Type: 'ANY' },
    })
    expect(wrapper.emitted('update')).toBeUndefined()
  })

  it('opens, applies, and dismisses embedded concept-set editing', async () => {
    const conceptSet: ConceptSet = { id: 7, name: 'Existing set', expression: { items: [] } }
    const wrapper = mountEditor([conceptSet])
    const setupState = (wrapper.vm as any).$.setupState
    const conceptSetsStore = useConceptSetsStore()

    setupState.handleCriteriaEditConceptSet({ targetRef: { value: 7 } })
    await wrapper.vm.$nextTick()
    expect(conceptSetsStore.currentSet).toMatchObject({ id: 7, name: 'Existing set' })
    expect(wrapper.findComponent({ name: 'ConceptSetEditor' }).exists()).toBe(true)

    setupState.handleConceptSetApplied({ id: 7, name: 'Updated set', items: [] })
    expect(wrapper.emitted('add-concept-set')?.[0]?.[0]).toMatchObject({
      id: 8,
      name: 'Updated set',
    })

    setupState.handleCreateNewConceptSet()
    expect(conceptSetsStore.editorOpen).toBe(true)
    setupState.onConceptSetEditorVisibilityChange(false)
    expect(conceptSetsStore.editorOpen).toBe(false)
  })

  it('forwards picker selections and rejects unknown concept-set edit targets', async () => {
    const wrapper = mountEditor([{ id: 7, name: 'Existing set', expression: { items: [] } }])
    const setupState = (wrapper.vm as any).$.setupState

    await expect(setupState.onConceptSetSelected({ id: 7, name: 'Existing set' })).resolves.toBeUndefined()
    expect(() => setupState.handleCriteriaEditConceptSet({ targetRef: { value: 99 } })).toThrow(
      'Incidence rate concept set 99 was not found in localConceptSets',
    )
  })
})