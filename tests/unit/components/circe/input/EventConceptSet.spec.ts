import { describe, it, expect, vi } from 'vitest'
import { nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import EventConceptSet from '@/components/circe/input/EventConceptSet.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

describe('EventConceptSet', () => {
  it('emits select when no concept set is selected', async () => {
    const wrapper = mount(EventConceptSet, {
      props: {
        conceptSets: [{ id: 7, name: 'Test Set' }],
      },
      global: {
        plugins: [vuetify],
      },
    })

    await wrapper.get('[data-testid="concept-set-picker"]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([undefined])
  })

  it('lets the chip edit and clear the selected concept set through the target ref', async () => {
    const modelValue = reactive({ CodesetId: 7, IsExclusion: false })
    const wrapper = mount(EventConceptSet, {
      props: {
        conceptSets: [{ id: 7, name: 'Test Set' }],
        modelValue,
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.text()).toContain('Test Set')

    const chip = wrapper.findComponent({ name: 'AtlasChip' })
    await chip.findComponent({ name: 'VChip' }).vm.$emit('click', new MouseEvent('click'))
    await nextTick()
    expect(wrapper.emitted('edit')?.[0]?.[0]).toMatchObject({ targetRef: { value: 7 } })

    await chip.findComponent({ name: 'VChip' }).vm.$emit('click:close', new MouseEvent('click'))
    await nextTick()
    expect(modelValue.CodesetId).toBeUndefined()
    expect(wrapper.emitted('clear')).toBeTruthy()
  })
})