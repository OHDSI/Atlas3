import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'
import { InlineAtlasMenuStub, mountComponent } from '../../../../helpers/component-wrapper'

import CorelatedCriteria from '@/components/circe/criteria/CorelatedCriteria.vue'
import { getWindowPresetOptions } from '@/components/circe/criteria/window-utils'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

function mountCriteria() {
  const criteria = {
    Criteria: { ConditionOccurrence: {} },
    Occurrence: { Type: 2, Count: 3, IsDistinct: false },
    RestrictVisit: false,
    IgnoreObservationPeriod: false,
    StartWindow: { Start: { Offset: 0, Use: 'event' }, End: { Offset: 0, Use: 'event' } },
  }

  return mountComponent(CorelatedCriteria as never, {
    props: {
      criteria,
      conceptSets: [{ id: 1, name: 'Concept Set' }],
    },
    stubs: { AtlasMenu: InlineAtlasMenuStub },
  })
}

describe('CorelatedCriteria', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the inner criteria and forwards concept-set events unchanged', async () => {
    const wrapper = mountCriteria()

    const occurrenceMenu = wrapper.findAllComponents({ name: 'AtlasMenu' })[0]
    await occurrenceMenu.vm.$emit('update:modelValue', true)
    await nextTick()

    expect(wrapper.find('.occurrence-label').text()).toBe('at least 3')
    expect(wrapper.text()).toContain('restrict to the same visit occurrence')
    expect(wrapper.text()).toContain('allow events from outside observation period')

    const conditionOccurrence = wrapper.findComponent({ name: 'ConditionOccurrence' })
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

  it('updates occurrence count and distinct settings through the inline menu stub', async () => {
    const wrapper = mountCriteria()

    await wrapper.get('.occurrence-chip--exactly').trigger('click')
    await nextTick()
    expect(wrapper.find('.occurrence-label').text()).toBe('exactly 3')

    await wrapper.get('.occurrence-chip--at_least').trigger('click')
    await nextTick()
    expect(wrapper.find('.occurrence-label').text()).toBe('at least 3')

    const occurrenceCount = wrapper.findAllComponents({ name: 'AtlasTextField' })[0]
    await occurrenceCount.vm.$emit('update:modelValue', '4')
    await nextTick()
    expect(wrapper.find('.occurrence-label').text()).toBe('at least 4')

    await wrapper.get('.occurrence-chip--at_most').trigger('click')
    await nextTick()
    expect(wrapper.find('.occurrence-label').text()).toBe('at most 4')

    await wrapper.get('.corelated-criteria-editor__distinct-chip').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('Using distinct events')

    const distinctSelect = wrapper.findComponent({ name: 'AtlasSelect' })
    await distinctSelect.vm.$emit('update:modelValue', 'START_DATE')
    await nextTick()
    expect(wrapper.find('.occurrence-label').text()).toContain('of distinct Start Date')
  })

  it('adds and removes the end window and applies a preset', async () => {
    const wrapper = mountCriteria()

    const windowMenu = wrapper.findAllComponents({ name: 'AtlasMenu' })[1]
    await windowMenu.vm.$emit('update:modelValue', true)
    await nextTick()

    await wrapper.get('.corelated-criteria-editor__window-chip').trigger('click')
    await nextTick()

    await wrapper.findAllComponents({ name: 'AtlasButton' }).find(button => button.text().includes('Add Temporal Window'))!.trigger('click')
    await nextTick()
    const criteria = wrapper.props('criteria') as any
    expect(criteria.EndWindow).toBeTruthy()

    const endWindow = wrapper.findAllComponents({ name: 'Window' })[1]
    const removeButton = endWindow.findAllComponents({ name: 'AtlasButton' }).find(button => button.props('icon') === 'mdi-delete')
    expect(removeButton).toBeTruthy()
    await removeButton!.trigger('click')
    await nextTick()
    expect(criteria.EndWindow).toBeUndefined()

    const preset = getWindowPresetOptions()[0].value
    const presetSelect = wrapper.findAllComponents({ name: 'AtlasSelect' }).find(select => select.props('label') === 'Quick Presets')
    expect(presetSelect).toBeTruthy()
    await presetSelect.vm.$emit('update:modelValue', preset)
    await nextTick()
    expect(wrapper.text()).toContain('30 days Before')

    const closeButton = wrapper.findAllComponents({ name: 'AtlasButton' }).find(button => button.text().includes('Close'))
    expect(closeButton).toBeTruthy()
    await closeButton!.trigger('click')
    await nextTick()
  })

  it('toggles the visit restriction flags', async () => {
    const wrapper = mountCriteria()

    await wrapper.get('.corelated-criteria-editor__flags .v-chip').trigger('click')
    await nextTick()
    expect(wrapper.props('criteria').RestrictVisit).toBe(true)

    await wrapper.get('.corelated-criteria-editor__flags .v-chip:nth-child(2)').trigger('click')
    await nextTick()
    expect(wrapper.props('criteria').IgnoreObservationPeriod).toBe(true)
  })
})
