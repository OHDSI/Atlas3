/**
 * LinkedFeatureAnalysisPicker component tests
 *
 * Empty state, list rendering, remove, the add dialog, and the design-level
 * Include Annual / Temporal Distribution options (stored on every row).
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

  it('renders linked rows without per-row annual/temporal toggles', () => {
    const wrapper = mountPicker([
      { id: 10, name: 'Demographics', description: 'Age + Sex' },
      { id: 11, name: 'Comorbidities', supportsAnnual: true, supportsTemporal: true },
    ])
    expect(wrapper.find('[data-testid="linked-fa-picker-row-10"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linked-fa-picker-row-11"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="linked-fa-picker-annual-11"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="linked-fa-picker-temporal-11"]').exists()).toBe(false)
    wrapper.unmount()
  })

  describe('design-level include annual / temporal options', () => {
    const annualBox = 'linked-fa-picker-include-annual'
    const temporalBox = 'linked-fa-picker-include-temporal'

    function checkbox(wrapper: ReturnType<typeof mountPicker>, testId: string) {
      return wrapper.get(`[data-testid="${testId}"] input[type="checkbox"]`)
    }

    function lastEmitted(wrapper: ReturnType<typeof mountPicker>): LinkedFeatureAnalysis[] {
      const emitted = wrapper.emitted('update:modelValue')
      expect(emitted).toBeTruthy()
      return emitted![emitted!.length - 1]![0] as LinkedFeatureAnalysis[]
    }

    it('disables both options until an analysis is linked', () => {
      const wrapper = mountPicker([])
      expect(checkbox(wrapper, annualBox).attributes('disabled')).toBeDefined()
      expect(checkbox(wrapper, temporalBox).attributes('disabled')).toBeDefined()
      wrapper.unmount()
    })

    it('shows an option as checked when any loaded row has the flag', () => {
      const wrapper = mountPicker([
        { id: 10, name: 'Demographics', includeTemporal: false, includeAnnual: false },
        { id: 11, name: 'Comorbidities', includeTemporal: true, includeAnnual: false },
      ])
      expect((checkbox(wrapper, temporalBox).element as HTMLInputElement).checked).toBe(true)
      expect((checkbox(wrapper, annualBox).element as HTMLInputElement).checked).toBe(false)
      expect(checkbox(wrapper, temporalBox).attributes('disabled')).toBeUndefined()
      wrapper.unmount()
    })

    it('re-derives the checked state when a different design is loaded', async () => {
      const wrapper = mountPicker([{ id: 10, name: 'Demographics', includeTemporal: true }])
      expect((checkbox(wrapper, temporalBox).element as HTMLInputElement).checked).toBe(true)

      await wrapper.setProps({ modelValue: [{ id: 11, name: 'Comorbidities', includeTemporal: false }] })
      expect((checkbox(wrapper, temporalBox).element as HTMLInputElement).checked).toBe(false)
      wrapper.unmount()
    })

    it('toggling on writes the flag to every row, supported or not', async () => {
      const wrapper = mountPicker([
        { id: 10, name: 'Demographics', supportsTemporal: true },
        { id: 11, name: 'Comorbidities' },
      ])

      await checkbox(wrapper, temporalBox).setValue(true)

      const next = lastEmitted(wrapper)
      expect(next.map(fa => fa.includeTemporal)).toEqual([true, true])
      expect(next.map(fa => fa.includeAnnual)).toEqual([undefined, undefined])
      wrapper.unmount()
    })

    it('toggling off clears the flag from every row', async () => {
      const wrapper = mountPicker([
        { id: 10, name: 'Demographics', includeAnnual: true },
        { id: 11, name: 'Comorbidities', includeAnnual: true },
      ])

      await checkbox(wrapper, annualBox).setValue(false)

      expect(lastEmitted(wrapper).map(fa => fa.includeAnnual)).toEqual([false, false])
      wrapper.unmount()
    })

    it('newly added analyses take the current option values and keep their supports flags', async () => {
      const wrapper = mount(LinkedFeatureAnalysisPicker, {
        props: {
          modelValue: [{ id: 10, name: 'Demographics', includeTemporal: true, includeAnnual: false }],
          availableFeatureAnalyses: [
            ...availableFeatureAnalyses,
            { id: 12, name: 'Drug era', type: 'PRESET', supportsAnnual: true, supportsTemporal: true },
          ],
        },
        global: { plugins: [vuetify] },
        attachTo: document.body,
      })

      await wrapper.get('[data-testid="linked-fa-picker-add"]').trigger('click')
      await flushPromises()
      ;(wrapper.vm as unknown as { $: { setupState: { selectedIds: number[] } } }).$.setupState.selectedIds = [11, 12]
      await flushPromises()
      ;(document.querySelector('[data-testid="linked-fa-picker-confirm"]') as HTMLButtonElement).click()
      await flushPromises()

      const added = lastEmitted(wrapper).filter(fa => fa.id !== 10)
      expect(added).toEqual([
        expect.objectContaining({ id: 11, includeTemporal: true, includeAnnual: false }),
        expect.objectContaining({
          id: 12,
          includeTemporal: true,
          includeAnnual: false,
          supportsAnnual: true,
          supportsTemporal: true,
        }),
      ])
      wrapper.unmount()
    })
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

  // Discussion #123: no way to filter the feature-analysis picker either.
  describe('search (discussion #123)', () => {
    it('renders a search field in the picker dialog', async () => {
      const wrapper = mountPicker([])

      await wrapper.get('[data-testid="linked-fa-picker-add"]').trigger('click')
      await flushPromises()

      const search = document.querySelector('[data-testid="linked-fa-picker-search"]')
      expect(search).not.toBeNull()
      wrapper.unmount()
    })

    it('filters the selectable feature analyses as the user types', async () => {
      const wrapper = mountPicker([])

      await wrapper.get('[data-testid="linked-fa-picker-add"]').trigger('click')
      await flushPromises()

      // Driven through the filter bar rather than a local ref, so this also
      // covers the picker's handler wiring.
      wrapper.findComponent({ name: 'AtlasFacetFilterBar' }).vm.$emit('update:resultFilter', 'comorbid')
      await flushPromises()

      const rows = document.querySelectorAll('[data-testid="linked-fa-picker-table"] tbody tr')
      const rowText = Array.from(rows).map(r => r.textContent)
      expect(rowText.some(text => text?.includes('Comorbidities'))).toBe(true)
      expect(rowText.some(text => text?.includes('Demographics'))).toBe(false)
      wrapper.unmount()
    })
  })
})

/**
 * Issue #216: the dialog offered only a text box over a library that runs to
 * ~1,400 analyses in a real deployment. These cover the facets themselves
 * narrowing the table, which is what text search alone could not do.
 */
describe('LinkedFeatureAnalysisPicker facets (#216)', () => {
  const openDialog = async (wrapper: ReturnType<typeof mount>) => {
    await wrapper.get('[data-testid="linked-fa-picker-add"]').trigger('click')
    await flushPromises()
  }

  const rowText = () =>
    Array.from(document.querySelectorAll('[data-testid="linked-fa-picker-table"] tbody tr')).map(
      row => row.textContent ?? ''
    )

  const filterBar = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findComponent({ name: 'AtlasFacetFilterBar' })

  it('offers the six facets Atlas 2.15 offers', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    const facets = filterBar(wrapper).props('facets') as Array<{ key: string }>

    expect(facets.map(f => f.key)).toEqual([
      'type', 'domain', 'created', 'updated', 'author', 'designs',
    ])
    wrapper.unmount()
  })

  it('narrows the table to the selected type', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    filterBar(wrapper).vm.$emit('update:facet', { key: 'type', values: ['Criteria set'] })
    await flushPromises()

    expect(rowText().some(text => text.includes('Comorbidities'))).toBe(true)
    expect(rowText().some(text => text.includes('Demographics'))).toBe(false)
    wrapper.unmount()
  })

  it('counts each facet option against the rows currently shown', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    const options = filterBar(wrapper).props('facetOptions') as Record<
      string,
      Array<{ value: string; label: string; count: number }>
    >

    // The same "value (count)" form 2.15 shows beside each facet value.
    expect(options.type).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'Criteria set', count: 1, label: 'Criteria set (1)' }),
        expect.objectContaining({ value: 'Preset', count: 1, label: 'Preset (1)' }),
      ])
    )
    wrapper.unmount()
  })

  it('does not offer an analysis that is already linked', async () => {
    const wrapper = mountPicker([{ id: 11 } as LinkedFeatureAnalysis])
    await openDialog(wrapper)

    const options = filterBar(wrapper).props('facetOptions') as Record<string, Array<{ value: string }>>

    expect(options.type.map(o => o.value)).toEqual(['Preset'])
    wrapper.unmount()
  })

  it('clears the filters again when the dialog is reopened', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    filterBar(wrapper).vm.$emit('update:facet', { key: 'type', values: ['Criteria set'] })
    await flushPromises()
    expect(filterBar(wrapper).props('activeFilterCount')).toBe(1)

    // Reopening runs the same reset the Cancel path leaves it in; the dialog's
    // own buttons are teleported out of the wrapper, so this drives it from the
    // Add button that opens it.
    await openDialog(wrapper)

    expect(filterBar(wrapper).props('activeFilterCount')).toBe(0)
    wrapper.unmount()
  })
})
