/**
 * The free-text filter over characterization results (#327).
 *
 * A single feature analysis can emit a row per concept in the vocabulary, so
 * the results strip needs a text filter next to the domain/analysis/cohort
 * ones rather than a search box of its own somewhere else.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ResultsFilterPanel from '@/components/characterization-results/ResultsFilterPanel.vue'

const vuetify = createVuetify({ components, directives })

function mountPanel(search = '') {
  return mount(ResultsFilterPanel, {
    global: { plugins: [vuetify] },
    props: {
      availableAnalyses: [{ id: 1, name: 'Conditions' }],
      availableDomains: ['Condition'],
      availableCohorts: [{ id: 1, name: 'Metformin' }],
      selectedAnalysisIds: [],
      selectedDomains: [],
      selectedCohortId: null,
      search,
    },
  })
}

describe('ResultsFilterPanel search', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders a search field alongside the other filters', () => {
    const w = mountPanel()
    expect(w.find('[data-testid="char-results-filter-search"]').exists()).toBe(true)
  })

  it('shows the current search term', () => {
    const w = mountPanel('depression')
    const input = w.find('[data-testid="char-results-filter-search"] input')
      .element as HTMLInputElement
    expect(input.value).toBe('depression')
  })

  it('emits the typed term', async () => {
    const w = mountPanel()

    await w.find('[data-testid="char-results-filter-search"] input').setValue('depression')

    expect(w.emitted('update:search')?.at(-1)).toEqual(['depression'])
  })

  it('emits an empty string rather than null when the field is cleared', async () => {
    const w = mountPanel('depression')

    // Vuetify's clearable emits null; the workbench filter state is a string.
    await w.find('[data-testid="char-results-filter-search"] input').setValue('')

    expect(w.emitted('update:search')?.at(-1)).toEqual([''])
  })
})
