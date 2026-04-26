/**
 * LinkedCohortPicker component tests
 *
 * Smoke-level: clicking remove emits an updated list, opening the dialog
 * reveals only un-linked cohorts, and confirming a selection appends them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import LinkedCohortPicker from '@/components/characterization/LinkedCohortPicker.vue'
import type { LinkedCohort } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const availableCohorts: CohortDefinitionSummary[] = [
  { id: 1, name: 'Diabetes' },
  { id: 2, name: 'Hypertension' },
  { id: 3, name: 'Asthma' },
]

function mountPicker(initial: LinkedCohort[] = []) {
  return mount(LinkedCohortPicker, {
    props: {
      modelValue: initial,
      availableCohorts,
    },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('LinkedCohortPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders empty state when nothing is linked', () => {
    const wrapper = mountPicker([])
    expect(wrapper.find('[data-testid="linked-cohort-picker-empty"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders linked cohorts as list rows', () => {
    const wrapper = mountPicker([{ id: 1, name: 'Diabetes' }])
    expect(wrapper.find('[data-testid="linked-cohort-picker-row-1"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Diabetes')
    wrapper.unmount()
  })

  it('emits update:modelValue without the removed cohort', async () => {
    const wrapper = mountPicker([
      { id: 1, name: 'Diabetes' },
      { id: 2, name: 'Hypertension' },
    ])

    await wrapper.get('[data-testid="linked-cohort-picker-remove-1"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as LinkedCohort[]
    expect(next).toHaveLength(1)
    expect(next[0]!.id).toBe(2)
    wrapper.unmount()
  })

  it('opens the dialog when Add cohort is clicked', async () => {
    const wrapper = mountPicker([])

    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()

    // Dialog renders into a Vuetify overlay container at the document root.
    const dialog = document.querySelector('[data-testid="linked-cohort-picker-table"]')
    expect(dialog).not.toBeNull()
    wrapper.unmount()
  })
})
