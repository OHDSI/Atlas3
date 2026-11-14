import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, reactive, ref } from 'vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import ReusableDesignEditor from '@/components/reusables/ReusableDesignEditor.vue'
import { createEmptyDesign, createParameter } from '@/components/reusables/reusable-design'
import { useNotifications } from '@/stores/notifications'
import type { ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'
import type { ReusableDesign } from '@/models/reusable.types'
import { InlineAtlasMenuStub } from '../../helpers/component-wrapper'

const vuetify = createVuetify({ components, directives })

// A criterion slot that asks for a concept set, standing in for the real
// criteria editors, which emit the same event.
const targetRef = ref<number | null | undefined>(undefined)
const CriteriaGroupStub = defineComponent({
  name: 'CriteriaGroup',
  props: { group: { type: Object, default: () => ({}) }, conceptSets: { type: Array, default: () => [] } },
  emits: ['select-concept-set', 'edit-concept-set', 'remove'],
  setup(props, { emit }) {
    const target: ConceptSetSelectionTarget = { targetRef }
    return () =>
      h('div', { 'data-testid': 'group-stub' }, [
        h('span', { 'data-testid': 'group-options' }, JSON.stringify(props.conceptSets)),
        h('button', { 'data-testid': 'group-select', onClick: () => emit('select-concept-set', target) }),
        h('button', { 'data-testid': 'group-edit', onClick: () => emit('edit-concept-set', target) }),
        h('button', { 'data-testid': 'group-remove', onClick: () => emit('remove') }),
      ])
  },
})

const PickerStub = defineComponent({
  name: 'ConceptSetSelectionDialog',
  props: { modelValue: Boolean },
  setup: props => () => (props.modelValue ? h('div', { 'data-testid': 'cs-picker-open' }) : null),
})

function mountEditor(design: ReusableDesign, readonly = false) {
  return mount(ReusableDesignEditor, {
    props: { design, readonly },
    attachTo: document.body,
    global: {
      plugins: [vuetify],
      stubs: {
        CriteriaGroup: CriteriaGroupStub,
        CriteriaRenderer: true,
        ConceptSetSelectionDialog: PickerStub,
        ConceptSearchDialog: true,
        ConceptSetEditor: true,
        AtlasMenu: InlineAtlasMenuStub,
      },
    },
  })
}

function query(testId: string) {
  return document.body.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null
}

describe('ReusableDesignEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setActivePinia(createPinia())
    targetRef.value = undefined
  })

  it('adds, renames and removes parameters', async () => {
    const design = reactive(createEmptyDesign())
    const wrapper = mountEditor(design)
    expect(wrapper.find('[data-testid="reusable-design-no-parameters"]').exists()).toBe(true)

    await wrapper.get('[data-testid="reusable-design-add-parameter"]').trigger('click')
    await wrapper.get('[data-testid="reusable-design-add-parameter"]').trigger('click')
    expect(design.parameters.map(p => p.name)).toEqual(['Parameter 1', 'Parameter 2'])

    await wrapper.get('[data-testid="reusable-design-parameter-1-name"] input').setValue('Exposure')
    expect(design.parameters[0]).toMatchObject({ name: 'Exposure', data: { name: 'Exposure' } })

    await wrapper.get('[data-testid="reusable-design-parameter-2-remove"]').trigger('click')
    expect(design.parameters.map(p => p.id)).toEqual([1])
    wrapper.unmount()
  })

  it('lists parameters as concept sets the criteria can use', () => {
    const design = reactive(createEmptyDesign())
    design.conceptSets.push({ id: 0, name: 'T2DM', expression: { items: [] } })
    design.parameters.push(createParameter([], 'Drug'))
    const wrapper = mountEditor(design)

    expect(JSON.parse(wrapper.get('[data-testid="group-options"]').text())).toEqual([
      { id: 0, name: 'T2DM' },
      { id: -1, name: 'Drug' },
    ])
    wrapper.unmount()
  })

  it('switches between the criteria group and the event list', async () => {
    const design = reactive(createEmptyDesign())
    const wrapper = mountEditor(design)
    expect(wrapper.findComponent({ name: 'CriteriaGroup' }).exists()).toBe(true)

    await wrapper.get('[data-testid="reusable-design-type-initial-event"]').trigger('click')

    expect(design.type).toBe('INITIAL_EVENT')
    expect(wrapper.findComponent({ name: 'CriteriaGroup' }).exists()).toBe(false)
    expect(wrapper.find('[data-testid="reusable-design-events"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('adds and removes entry events', async () => {
    const design = reactive(createEmptyDesign('INITIAL_EVENT'))
    const wrapper = mountEditor(design)

    const items = wrapper.findAll('.v-list-item')
    await items[0].trigger('click')

    expect(design.initialEventExpression.CriteriaList).toHaveLength(1)
    wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('remove')
    expect(design.initialEventExpression.CriteriaList).toEqual([])
    wrapper.unmount()
  })

  it('assigns a parameter to a criterion when the author picks one', async () => {
    const design = reactive(createEmptyDesign())
    design.parameters.push(createParameter([], 'Drug'))
    const wrapper = mountEditor(design)

    query('group-select')!.click()
    await flushPromises()
    expect(query('reusable-design-assign-dialog')).not.toBeNull()
    expect(query('cs-picker-open')).toBeNull()

    query('reusable-design-assign-parameter-1')!.click()
    await flushPromises()

    expect(targetRef.value).toBe(-1)
    wrapper.unmount()
  })

  it('falls through to the concept set picker when the author wants a concept set', async () => {
    const design = reactive(createEmptyDesign())
    design.parameters.push(createParameter([]))
    const wrapper = mountEditor(design)

    query('group-select')!.click()
    await flushPromises()
    query('reusable-design-assign-concept-set')!.click()
    await flushPromises()

    expect(query('cs-picker-open')).not.toBeNull()
    expect(targetRef.value).toBeUndefined()
    wrapper.unmount()
  })

  it('goes straight to the concept set picker when there are no parameters', async () => {
    const wrapper = mountEditor(reactive(createEmptyDesign()))

    query('group-select')!.click()
    await flushPromises()

    expect(query('reusable-design-assign-dialog')).toBeNull()
    expect(query('cs-picker-open')).not.toBeNull()
    wrapper.unmount()
  })

  it('explains that a parameter has no concepts to edit', async () => {
    const design = reactive(createEmptyDesign())
    design.parameters.push(createParameter([]))
    const wrapper = mountEditor(design)
    const info = vi.spyOn(useNotifications(), 'info')
    targetRef.value = -1

    query('group-edit')!.click()
    await flushPromises()

    expect(info).toHaveBeenCalledWith(
      'A parameter has no concepts of its own; they are chosen when the reusable is inserted.'
    )
    wrapper.unmount()
  })

  it('removes one of its own concept sets and clears the criteria that used it', async () => {
    const design = reactive(createEmptyDesign())
    design.conceptSets.push({ id: 0, name: 'T2DM', expression: { items: [] } })
    design.criteriaGroupExpression.CriteriaList = [{ Criteria: { ConditionOccurrence: { CodesetId: 0 } } }]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="reusable-design-concept-set-0-remove"]').trigger('click')

    expect(design.conceptSets).toEqual([])
    expect(design.criteriaGroupExpression.CriteriaList?.[0].Criteria).toEqual({
      ConditionOccurrence: { CodesetId: undefined },
    })
    wrapper.unmount()
  })

  it('empties the group when its delete button is used', async () => {
    const design = reactive(createEmptyDesign())
    design.criteriaGroupExpression.CriteriaList = [{ Criteria: { Death: {} } }]
    const wrapper = mountEditor(design)

    query('group-remove')!.click()
    await flushPromises()

    expect(design.criteriaGroupExpression).toEqual({
      Type: 'ALL',
      CriteriaList: [],
      DemographicCriteriaList: [],
      Groups: [],
    })
    wrapper.unmount()
  })

  it('cannot be interacted with when read-only', () => {
    const wrapper = mountEditor(reactive(createEmptyDesign()), true)
    expect(wrapper.get('[data-testid="reusable-design"]').attributes('inert')).toBeDefined()
    wrapper.unmount()
  })
})
