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
import { AtlasSelect } from '@/components/ui'

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
      selectedCohortIds: [],
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

  it('commits cohort selections when the menu closes, not for each option click', async () => {
    const w = mount(ResultsFilterPanel, {
      global: { plugins: [vuetify] },
      props: {
        availableAnalyses: [],
        availableDomains: [],
        availableCohorts: [{ id: 1, name: 'Metformin' }, { id: 2, name: 'Warfarin' }],
        selectedAnalysisIds: [],
        selectedDomains: [],
        selectedCohortIds: [],
        search: '',
      },
    })
    const cohortSelect = w.findAllComponents(AtlasSelect)[2]
    const onMenuUpdate = cohortSelect.vm.$attrs['onUpdate:menu'] as (isOpen: boolean) => void

    onMenuUpdate(true)
    await cohortSelect.vm.$emit('update:modelValue', [1])
    await cohortSelect.vm.$emit('update:modelValue', [1, 2])

    expect(w.emitted('update:selectedCohortIds')).toBeUndefined()

    onMenuUpdate(false)

    expect(w.emitted('update:selectedCohortIds')).toEqual([[[1, 2]]])
  })

  it('does not emit a cohort update when the menu closes without changes', () => {
    const w = mountPanel()
    const cohortSelect = w.findAllComponents(AtlasSelect)[2]
    const onMenuUpdate = cohortSelect.vm.$attrs['onUpdate:menu'] as (isOpen: boolean) => void

    onMenuUpdate(true)
    onMenuUpdate(false)

    expect(w.emitted('update:selectedCohortIds')).toBeUndefined()
  })

  it('commits domain and analysis selections when their menus close', async () => {
    const w = mountPanel()
    const [domainSelect, analysisSelect] = w.findAllComponents(AtlasSelect)
    const onDomainMenuUpdate = domainSelect!.vm.$attrs['onUpdate:menu'] as (isOpen: boolean) => void
    const onAnalysisMenuUpdate = analysisSelect!.vm.$attrs['onUpdate:menu'] as (isOpen: boolean) => void

    onDomainMenuUpdate(true)
    await domainSelect!.vm.$emit('update:modelValue', ['Condition'])
    expect(w.emitted('update:selectedDomains')).toBeUndefined()
    onDomainMenuUpdate(false)

    onAnalysisMenuUpdate(true)
    await analysisSelect!.vm.$emit('update:modelValue', [1])
    expect(w.emitted('update:selectedAnalysisIds')).toBeUndefined()
    onAnalysisMenuUpdate(false)

    expect(w.emitted('update:selectedDomains')).toEqual([[['Condition']]])
    expect(w.emitted('update:selectedAnalysisIds')).toEqual([[[1]]])
  })

  it('normalizes analysis and domain selector values', async () => {
    const w = mountPanel()
    const [domainSelect, analysisSelect, cohortSelect] = w.findAllComponents(AtlasSelect)

    await domainSelect!.vm.$emit('update:modelValue', ['Condition', 3])
    await analysisSelect!.vm.$emit('update:modelValue', [1, 'invalid'])
    await domainSelect!.vm.$emit('update:modelValue', null)
    await analysisSelect!.vm.$emit('update:modelValue', undefined)
    await cohortSelect!.vm.$emit('update:modelValue', ['invalid'])

    expect(w.emitted('update:selectedDomains')).toEqual([[['Condition']], [[]]])
    expect(w.emitted('update:selectedAnalysisIds')).toEqual([[[1]], [[]]])
    expect(w.emitted('update:selectedCohortIds')).toEqual([[[]]])
  })
})
