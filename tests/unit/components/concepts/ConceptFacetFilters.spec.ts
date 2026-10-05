import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import ConceptFacetFilters from '@/components/concepts/ConceptFacetFilters.vue'
import type { FacetKey, FacetOption } from '@/composables/useConceptFacets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    locale: ref('en-US'),
  }),
}))

const vuetify = createVuetify({ components, directives })

const facetOptions: Record<FacetKey, FacetOption[]> = {
  vocabularyId: [
    { value: 'SNOMED', label: 'SNOMED (2)', count: 2 },
    { value: 'RxNorm', label: 'RxNorm (1)', count: 1 },
  ],
  domainId: [{ value: 'Drug', label: 'Drug (1)', count: 1 }],
  standardConcept: [],
  conceptClassId: [],
  invalidReason: [],
}

const emptySelected: Record<FacetKey, string[]> = {
  vocabularyId: [], domainId: [], standardConcept: [], conceptClassId: [], invalidReason: [],
}

function mountComponent(props = {}) {
  return mount(ConceptFacetFilters, {
    props: { facetOptions, selected: emptySelected, activeFilterCount: 0, ...props },
    global: { plugins: [vuetify] },
  })
}

describe('ConceptFacetFilters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the Filters menu button', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.facet-filter-bar__bar').exists()).toBe(true)
    expect(wrapper.text()).toContain('Filters')
  })

  it('renders the filter menu above an embedded concept-set editor drawer', () => {
    const wrapper = mountComponent()
    expect(wrapper.findComponent({ name: 'VMenu' }).props('zIndex')).toBe(2201)
  })

  it('shows the active-count badge when filters are active', () => {
    const wrapper = mountComponent({ activeFilterCount: 2 })
    expect(wrapper.find('.facet-filter-bar__count').text()).toBe('2')
  })

  it('renders an active chip per selected value and emits update:facet on close', async () => {
    const selected = { ...emptySelected, vocabularyId: ['SNOMED'] }
    const wrapper = mountComponent({ selected, activeFilterCount: 1 })
    const chips = wrapper.findAll('.facet-filter-bar__active .v-chip')
    expect(chips.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('SNOMED')
  })

  it('emits update:facet with the value removed when an active chip is closed', async () => {
    const selected = { ...emptySelected, vocabularyId: ['SNOMED'] }
    const wrapper = mountComponent({ selected, activeFilterCount: 1 })
    const active = wrapper.find('.facet-filter-bar__active')
    expect(active.exists()).toBe(true)

    const chip = active.find('.v-chip')
    await chip.find('.v-chip__close').trigger('click')

    const events = wrapper.emitted('update:facet')
    expect(events).toBeTruthy()
    expect(events![events!.length - 1][0]).toEqual({ key: 'vocabularyId', values: [] })
  })

  it('emits clear when Clear all is clicked', async () => {
    const wrapper = mountComponent({ activeFilterCount: 1 })
    const clearBtn = wrapper
      .findAll('button')
      .find(b => b.text().includes('Clear all'))
    await clearBtn!.trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  describe('filters menu', () => {
    async function openMenu(props = {}) {
      const wrapper = mount(ConceptFacetFilters, {
        props: { facetOptions, selected: emptySelected, activeFilterCount: 0, ...props },
        global: { plugins: [vuetify] },
        attachTo: document.body,
      })
      wrapper.findComponent({ name: 'VMenu' }).vm.$emit('update:modelValue', true)
      await flushPromises()
      return wrapper
    }

    const facet = (wrapper: Awaited<ReturnType<typeof openMenu>>, label: string) =>
      wrapper.findAllComponents({ name: 'VAutocomplete' }).find(a => a.props('label') === label)!

    it('emits the new values when a facet selection changes', async () => {
      const wrapper = await openMenu()

      facet(wrapper, 'Domain').vm.$emit('update:modelValue', ['Drug'])

      expect(wrapper.emitted('update:facet')!.at(-1)![0]).toEqual({
        key: 'domainId',
        values: ['Drug'],
      })
      wrapper.unmount()
    })

    it('keeps a selected value that dropped out of the options so its chip still resolves', async () => {
      const selected = { ...emptySelected, domainId: ['Gone'] }
      const wrapper = await openMenu({ selected, activeFilterCount: 1 })

      const values = (facet(wrapper, 'Domain').props('items') as { value: string }[]).map(i => i.value)
      expect(values).toEqual(['Drug', 'Gone'])
      wrapper.unmount()
    })

    it('emits clear from the menu header', async () => {
      const wrapper = await openMenu({ activeFilterCount: 1 })

      const clearButtons = wrapper
        .findAllComponents({ name: 'VBtn' })
        .filter(b => b.text().includes('Clear all'))
      for (const b of clearButtons) await b.trigger('click')

      expect(wrapper.emitted('clear')!.length).toBe(clearButtons.length)
      wrapper.unmount()
    })
  })
})
