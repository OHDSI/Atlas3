import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import DateAdjustment from '@/components/circe/input/DateAdjustment.vue'
import DateRange from '@/components/circe/input/DateRange.vue'
import NumericRange from '@/components/circe/input/NumericRange.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const sharedStubs = {
}

describe('Range-style input controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('writes date range operator/value/extent updates back through the model binding', async () => {
    const modelValue = reactive({
      Op: 'gte',
      Value: '2024-01-15',
      Extent: undefined as string | undefined,
    })

    const wrapper = mount(DateRange, {
      props: { modelValue },
      global: {
        plugins: [vuetify],
        stubs: sharedStubs,
      },
    })

    expect(wrapper.find('.date-range__extent').exists()).toBe(false)

    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    expect(modelValue.Op).toBe('bt')
    expect(wrapper.find('.date-range__extent').exists()).toBe(true)

    const textFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(textFields).toHaveLength(2)
    await textFields[0].vm.$emit('update:modelValue', '2024-01-20')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '2024-02-20')
    await nextTick()
    expect(modelValue.Value).toBe('2024-01-20')
    expect(modelValue.Extent).toBe('2024-02-20')

    await textFields[0].vm.$emit('update:modelValue', '')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '')
    await nextTick()
    expect(modelValue.Value).toBeUndefined()
    expect(modelValue.Extent).toBeUndefined()

    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'eq')
    await nextTick()
    expect(modelValue.Op).toBe('eq')
    expect(wrapper.find('.date-range__extent').exists()).toBe(false)
  })

  it('writes numeric range operator/value/extent updates back through the model binding', async () => {
    const modelValue = reactive({
      Op: undefined as string | undefined,
      Value: undefined as number | undefined,
      Extent: undefined as number | undefined,
    })

    const wrapper = mount(NumericRange, {
      props: { modelValue },
      global: {
        plugins: [vuetify],
        stubs: sharedStubs,
      },
    })

    expect(wrapper.findComponent({ name: 'AtlasSelect' }).props('modelValue')).toBe('gte')
    expect(wrapper.find('.numeric-range__extent').exists()).toBe(false)

    await wrapper.findComponent({ name: 'AtlasSelect' }).vm.$emit('update:modelValue', 'bt')
    await nextTick()
    expect(modelValue.Op).toBe('bt')
    expect(wrapper.find('.numeric-range__extent').exists()).toBe(true)

    const textFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(textFields).toHaveLength(2)
    await textFields[0].vm.$emit('update:modelValue', '18')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '65')
    await nextTick()
    expect(modelValue.Value).toBe(18)
    expect(modelValue.Extent).toBe(65)

    await textFields[0].vm.$emit('update:modelValue', '')
    await nextTick()
    expect(modelValue.Value).toBeUndefined()
  })

  it('keeps date adjustment offsets numeric and falls back to zero when cleared', async () => {
    const modelValue = reactive({
      StartWith: 'START_DATE',
      StartOffset: undefined as number | undefined,
      EndWith: 'END_DATE',
      EndOffset: undefined as number | undefined,
    })

    const wrapper = mount(DateAdjustment, {
      props: { modelValue },
      global: {
        plugins: [vuetify],
        stubs: sharedStubs,
      },
    })

    await wrapper.get('[data-testid="attribute-date-adjustment-chip"]').trigger('click')
    await nextTick()

    const textFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(textFields).toHaveLength(2)

    await textFields[0].vm.$emit('update:modelValue', '12')
    await nextTick()
    await textFields[1].vm.$emit('update:modelValue', '-3')
    await nextTick()
    expect(modelValue.StartOffset).toBe(12)
    expect(modelValue.EndOffset).toBe(-3)

    await textFields[0].vm.$emit('update:modelValue', '')
    await nextTick()
    expect(modelValue.StartOffset).toBe(0)
  })
})