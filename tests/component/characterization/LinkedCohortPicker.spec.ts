import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import LinkedCohortPicker from '@/components/characterization/LinkedCohortPicker.vue'

const vuetify = createVuetify({ components, directives })

const availableCohorts = [
  { id: 1, name: 'Target cohort' },
  { id: 2, name: 'Outcome cohort' },
]

function mountPicker(modelValue = availableCohorts.slice(0, 1)) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(LinkedCohortPicker, {
    props: { modelValue, availableCohorts },
    global: {
      plugins: [vuetify, pinia],
      stubs: {
        CohortPickerDialog: {
          name: 'CohortPickerDialog',
          props: ['modelValue'],
          template: '<div />',
        },
      },
    },
  })
}

describe('LinkedCohortPicker', () => {
  it('shows an empty state when no cohorts are linked', () => {
    const wrapper = mountPicker([])
    expect(wrapper.find('[data-testid="linked-cohort-picker-empty"]').exists()).toBe(true)
  })

  it('opens the dialog, adds only new cohorts, and removes a linked cohort', async () => {
    const wrapper = mountPicker()

    await wrapper.find('[data-testid="linked-cohort-picker-add"]').trigger('click')
    expect(wrapper.findComponent({ name: 'CohortPickerDialog' }).props('modelValue')).toBe(true)

    await wrapper.findComponent({ name: 'CohortPickerDialog' }).vm.$emit('select', [
      { id: 1, name: 'Target cohort' },
      { id: 2, name: 'Outcome cohort' },
    ])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([availableCohorts])
    expect(wrapper.findComponent({ name: 'CohortPickerDialog' }).props('modelValue')).toBe(false)

    await wrapper.setProps({ modelValue: availableCohorts })
    await wrapper.find('[data-testid="linked-cohort-picker-remove-1"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([[{ id: 2, name: 'Outcome cohort' }]])
  })
})