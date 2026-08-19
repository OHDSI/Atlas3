import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'

import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

describe('CriteriaRenderer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the mapped editor and forwards concept-set events unchanged', async () => {
    const criteria = { ConditionOccurrence: {} }
    const wrapper = mountComponent(CriteriaRenderer as never, {
      props: {
        criteria,
        conceptSets: [{ id: 1, name: 'Concept Set' }],
      },
      stubs: { AtlasMenu: InlineAtlasMenuStub },
    })

    const conditionOccurrence = wrapper.findComponent({ name: 'ConditionOccurrence' })
    expect(conditionOccurrence.exists()).toBe(true)

    const selectionTarget = { targetRef: { value: 42 } }
    conditionOccurrence.vm.$emit('select-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('select-concept-set')?.at(-1)).toEqual([selectionTarget])

    conditionOccurrence.vm.$emit('edit-concept-set', selectionTarget)
    await nextTick()
    expect(wrapper.emitted('edit-concept-set')?.at(-1)).toEqual([selectionTarget])

    conditionOccurrence.vm.$emit('clear-concept-set')
    await nextTick()
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])

    conditionOccurrence.vm.$emit('remove')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })

  it('falls back to the placeholder when no editor is mapped', async () => {
    const wrapper = mountComponent(CriteriaRenderer as never, {
      props: {
        criteria: {},
        conceptSets: [],
      },
    })

    expect(wrapper.find('.criteria-renderer__placeholder').exists()).toBe(true)
    await wrapper.get('.criteria-renderer__placeholder .v-btn').trigger('click')
    await nextTick()
    expect(wrapper.emitted('remove')?.at(-1)).toEqual([])
  })
})
