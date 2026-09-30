import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CharacterizationConceptSetsTab from '@/components/characterization/CharacterizationConceptSetsTab.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function mountTab(strataConceptSets?: Array<{ id?: number; name: string }>) {
  return mount(CharacterizationConceptSetsTab, {
    global: { plugins: [vuetify] },
    props: { characterization: { strataConceptSets } as never },
  })
}

describe('CharacterizationConceptSetsTab', () => {
  it('shows the empty state when the characterization has no concept sets', () => {
    const wrapper = mountTab()

    expect(wrapper.get('[data-testid="char-conceptsets-empty"]').text()).toContain('No data')
    expect(wrapper.find('[data-testid="char-conceptsets-list"]').exists()).toBe(false)
  })

  it('renders every stratum-derived concept set', () => {
    const wrapper = mountTab([
      { id: 1, name: 'Type 2 diabetes' },
      { id: 2, name: 'ACE inhibitors' },
    ])

    expect(wrapper.find('[data-testid="char-conceptsets-empty"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="char-conceptsets-list"]').text()).toContain('Type 2 diabetes')
    expect(wrapper.get('[data-testid="char-conceptsets-list"]').text()).toContain('ACE inhibitors')
  })
})