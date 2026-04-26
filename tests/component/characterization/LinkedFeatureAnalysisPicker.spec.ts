/**
 * LinkedFeatureAnalysisPicker component tests
 *
 * Smoke-level: empty state, list rendering, and remove emits the filtered
 * model. Annual/Temporal toggles are present but disabled until the
 * backing FA list endpoint exposes the supports* flags.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import LinkedFeatureAnalysisPicker from '@/components/characterization/LinkedFeatureAnalysisPicker.vue'
import type { LinkedFeatureAnalysis } from '@/models/characterization.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

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

const availableFeatureAnalyses: FeatureAnalysisListItem[] = [
  {
    id: 10,
    name: 'Demographics',
    description: 'Age + Sex',
    type: 'PRESET',
  },
  {
    id: 11,
    name: 'Comorbidities',
    description: 'Common conditions',
    type: 'CRITERIA_SET',
  },
]

function mountPicker(initial: LinkedFeatureAnalysis[] = []) {
  return mount(LinkedFeatureAnalysisPicker, {
    props: {
      modelValue: initial,
      availableFeatureAnalyses,
    },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('LinkedFeatureAnalysisPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders empty state when nothing is linked', () => {
    const wrapper = mountPicker([])
    expect(wrapper.find('[data-testid="linked-fa-picker-empty"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders linked rows with name + per-row toggles', () => {
    const wrapper = mountPicker([
      { id: 10, name: 'Demographics', description: 'Age + Sex' },
    ])
    expect(wrapper.find('[data-testid="linked-fa-picker-row-10"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linked-fa-picker-annual-10"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linked-fa-picker-temporal-10"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('removing an FA emits the filtered model', async () => {
    const wrapper = mountPicker([
      { id: 10, name: 'Demographics' },
      { id: 11, name: 'Comorbidities' },
    ])

    await wrapper.get('[data-testid="linked-fa-picker-remove-10"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as LinkedFeatureAnalysis[]
    expect(next).toHaveLength(1)
    expect(next[0]!.id).toBe(11)
    wrapper.unmount()
  })

  it('opens the dialog when Add feature analysis is clicked', async () => {
    const wrapper = mountPicker([])

    await wrapper.get('[data-testid="linked-fa-picker-add"]').trigger('click')
    await flushPromises()

    const dialogTable = document.querySelector('[data-testid="linked-fa-picker-table"]')
    expect(dialogTable).not.toBeNull()
    wrapper.unmount()
  })
})
