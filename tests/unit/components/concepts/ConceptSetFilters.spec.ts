import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import ConceptSetFilters from '@/components/concepts/ConceptSetFilters.vue'
import type { ConceptSetFilterState } from '@/stores/concept-sets'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, fallback?: string) => ref(fallback || key),
    locale: ref('en-US'),
  }),
}))

const vuetify = createVuetify({ components, directives })

const defaultFilters: ConceptSetFilterState = {
  searchQuery: '',
  author: '',
  createdDateRange: { from: undefined, to: undefined },
  modifiedDateRange: { from: undefined, to: undefined },
}

function mountComponent(props = {}) {
  return mount(ConceptSetFilters, {
    props: {
      filters: defaultFilters,
      availableAuthors: ['alice', 'bob'],
      activeFilterCount: 0,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('ConceptSetFilters', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders the filter bar with a search field', () => {
    const wrapper = mountComponent()
    expect(wrapper.find('.concept-set-filters__bar').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'VTextField' }).exists()).toBe(true)
  })

  it('renders the active-count badge', () => {
    const wrapper = mountComponent({ activeFilterCount: 2 })
    expect(wrapper.find('.concept-set-filters__menu-count').text()).toBe('2')
  })

  it('emits update:filters when the search query changes', async () => {
    const wrapper = mountComponent()
    const input = wrapper.find('input')
    await input.setValue('diabetes')
    const events = wrapper.emitted('update:filters')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as ConceptSetFilterState
    expect(last.searchQuery).toBe('diabetes')
  })

  it('emits clear from the active-chip row Clear all button', async () => {
    const filters = { ...defaultFilters, author: 'bob' }
    const wrapper = mountComponent({ filters, activeFilterCount: 1 })
    const clearBtn = wrapper.findAll('button').find(b => b.text().includes('Clear all'))
    await clearBtn!.trigger('click')
    expect(wrapper.emitted('clear')).toBeTruthy()
  })

  it('resyncs local state from a prop change without re-emitting update:filters', async () => {
    const wrapper = mountComponent()
    const emittedBefore = wrapper.emitted('update:filters')?.length ?? 0

    await wrapper.setProps({
      filters: {
        searchQuery: 'updated',
        author: 'alice',
        createdDateRange: {},
        modifiedDateRange: {},
      },
    })
    // Two ticks: one for the watch to apply, one for the internal guard to reset.
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // (a) local state reflects the new prop value
    expect(wrapper.find('input').element.value).toBe('updated')

    // (b) the external prop change did not cause a re-emit (isInternalUpdate guard)
    const emittedAfter = wrapper.emitted('update:filters')?.length ?? 0
    expect(emittedAfter).toBe(emittedBefore)
  })

  it('removes the author via the active-filter chip close, emitting update:filters', async () => {
    const filters = { ...defaultFilters, author: 'alice' }
    const wrapper = mountComponent({ filters, activeFilterCount: 1 })

    const active = wrapper.find('.concept-set-filters__active')
    expect(active.exists()).toBe(true)
    expect(active.text()).toContain('alice')

    const closeBtn = active.find('.v-chip__close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const events = wrapper.emitted('update:filters')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as ConceptSetFilterState
    expect(last.author).toBe('')
  })

  it('removes the created-from date via its chip close', async () => {
    const filters: ConceptSetFilterState = {
      ...defaultFilters,
      createdDateRange: { from: new Date('2024-01-01'), to: undefined },
    }
    const wrapper = mountComponent({ filters, activeFilterCount: 1 })

    const active = wrapper.find('.concept-set-filters__active')
    expect(active.exists()).toBe(true)

    const closeBtn = active.find('.v-chip__close')
    expect(closeBtn.exists()).toBe(true)
    await closeBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // The close handler clears localFilters.createdDateRange.from, so the active
    // row (and its chip) is removed from the DOM.
    expect(wrapper.find('.concept-set-filters__active').exists()).toBe(false)
  })
})
