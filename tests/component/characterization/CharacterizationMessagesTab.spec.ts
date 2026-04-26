/**
 * CharacterizationMessagesTab tests
 *
 * Smoke-level: empty state when the design is valid; error / warning /
 * info groups render with the expected counts when the validator surfaces
 * issues.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CharacterizationMessagesTab from '@/components/characterization/CharacterizationMessagesTab.vue'
import type { CharacterizationDefinition } from '@/models/characterization.types'

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

function makeValidDef(): CharacterizationDefinition {
  return {
    name: 'Valid',
    cohorts: [{ id: 1, name: 'Cohort' }],
    featureAnalyses: [{ id: 2 }],
    stratas: [],
  }
}

function mountTab(def: CharacterizationDefinition | null) {
  return mount(CharacterizationMessagesTab, {
    props: { characterization: def },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('CharacterizationMessagesTab', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders the empty state when the design is valid', () => {
    const wrapper = mountTab(makeValidDef())
    expect(wrapper.find('[data-testid="char-messages-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="char-messages-group-errors"]').exists()).toBe(
      false
    )
    wrapper.unmount()
  })

  it('renders the empty state when characterization is null', () => {
    const wrapper = mountTab(null)
    expect(wrapper.find('[data-testid="char-messages-empty"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders an errors group when the design has errors', () => {
    const wrapper = mountTab({
      name: '',
      cohorts: [],
      featureAnalyses: [],
      stratas: [],
    })
    expect(wrapper.find('[data-testid="char-messages-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="char-messages-group-errors"]').exists()).toBe(
      true
    )
    expect(wrapper.findAll('[data-testid="char-messages-item-error"]').length).toBe(3)
    wrapper.unmount()
  })

  it('renders a warnings group when the design has warnings', () => {
    const wrapper = mountTab({
      name: 'Valid',
      cohorts: [{ id: 1, name: 'Cohort' }],
      featureAnalyses: [{ id: 2 }],
      stratas: [
        { id: 's1', name: '', criteria: {} },
        { id: 's2', name: 'A', criteria: {} },
        { id: 's3', name: 'A', criteria: {} },
      ],
    })
    expect(wrapper.find('[data-testid="char-messages-group-warnings"]').exists()).toBe(
      true
    )
    expect(wrapper.findAll('[data-testid="char-messages-item-warning"]').length).toBe(2)
    wrapper.unmount()
  })

  it('renders an infos group when many feature analyses are linked', () => {
    const featureAnalyses = Array.from({ length: 51 }, (_, i) => ({ id: i + 1 }))
    const wrapper = mountTab({
      name: 'Valid',
      cohorts: [{ id: 1, name: 'Cohort' }],
      featureAnalyses,
      stratas: [],
    })
    expect(wrapper.find('[data-testid="char-messages-group-infos"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="char-messages-item-info"]').length).toBe(1)
    wrapper.unmount()
  })
})
