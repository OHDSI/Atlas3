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
})
