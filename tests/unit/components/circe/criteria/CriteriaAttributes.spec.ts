import { describe, it, expect, vi } from 'vitest'
import { nextTick, defineComponent } from 'vue'
import { mountComponent } from '../../../../helpers/component-wrapper'

import CriteriaAttributes from '@/components/circe/criteria/CriteriaAttributes.vue'
import type { CriteriaAttributeSpec } from '@/components/circe/criteria/criteria-editor.types'

describe('CriteriaAttributes', () => {
  it('forwards concept-set events from a nested criteria group row', async () => {
    const criteriaGroupStub = defineComponent({
      name: 'CriteriaGroup',
      emits: ['remove', 'select-concept-set', 'edit-concept-set', 'clear-concept-set'],
      template: '<div />',
    })

    const clearRow = vi.fn()
    const attributes: CriteriaAttributeSpec[] = [
      {
        key: 'Nested',
        label: 'Nested Criteria',
        kind: 'criteriaGroup',
        componentProps: () => ({ group: {} }),
        init: () => undefined,
        clear: clearRow,
        isActive: () => true,
      },
    ]

    const wrapper = mountComponent(CriteriaAttributes, {
      props: {
        attributes,
        conceptSets: [{ id: 1, name: 'Concept Set' }],
      },
      stubs: {
        NumericRange: true,
        ConceptArray: true,
        DateRange: true,
        ConceptSetSelection: true,
        DateAdjustment: true,
        TextFilter: true,
        Period: true,
        CriteriaGroup: criteriaGroupStub,
        AtlasButton: true,
        AtlasIcon: true,
        AtlasTooltip: true,
      },
    })

    const nestedCriteria = wrapper.getComponent({ name: 'CriteriaGroup' })
    const selectionTarget = { targetRef: { value: 42 } }

    nestedCriteria.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    nestedCriteria.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    nestedCriteria.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    nestedCriteria.vm.$emit('remove')
    await nextTick()
    expect(clearRow).toHaveBeenCalledTimes(1)
  })

  it('renders only rows whose spec reports active', () => {
    const attributes: CriteriaAttributeSpec[] = [
      {
        key: 'Age',
        label: 'Age',
        kind: 'numericRange',
        componentProps: () => ({
          modelValue: null,
        }),
        init: () => undefined,
        clear: () => undefined,
        isActive: () => false,
      },
      {
        key: 'Race',
        label: 'Race',
        kind: 'conceptArray',
        componentProps: () => ({
          modelValue: [],
        }),
        init: () => undefined,
        clear: () => undefined,
        isActive: () => true,
      },
    ]

    const wrapper = mountComponent(CriteriaAttributes, {
      props: {
        attributes,
        conceptSets: [],
      },
      stubs: {
        NumericRange: true,
        ConceptArray: true,
        DateRange: true,
        ConceptSetSelection: true,
        DateAdjustment: true,
        TextFilter: true,
        Period: true,
        CriteriaGroup: true,
        AtlasButton: true,
        AtlasIcon: true,
        AtlasTooltip: true,
      },
    })

    expect(wrapper.text()).toContain('Race')
    expect(wrapper.text()).not.toContain('Age')
  })

  it('renders label-only rows and clears them through the delete action', async () => {
    const clearRow = vi.fn()
    const attributes: CriteriaAttributeSpec[] = [
      {
        key: 'Status',
        label: 'Status',
        description: 'Filter by status',
        init: () => undefined,
        clear: clearRow,
        isActive: () => true,
      },
    ]

    const wrapper = mountComponent(CriteriaAttributes, {
      props: {
        attributes,
        conceptSets: [],
      },
      stubs: {
        NumericRange: true,
        ConceptArray: true,
        DateRange: true,
        ConceptSetSelection: true,
        DateAdjustment: true,
        TextFilter: true,
        Period: true,
        CriteriaGroup: true,
        AtlasButton: true,
        AtlasIcon: true,
        AtlasTooltip: true,
      },
    })

    expect(wrapper.find('.attribute-container--label-only').exists()).toBe(true)
    expect(wrapper.text()).toContain('Status')

    await wrapper.getComponent({ name: 'AtlasButton' }).vm.$emit('click')

    expect(clearRow).toHaveBeenCalledTimes(1)
  })
})