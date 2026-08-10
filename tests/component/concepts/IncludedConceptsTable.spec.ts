import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import IncludedConceptsTable from '@/components/concepts/IncludedConceptsTable.vue'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({ t: (_k: string, fallback?: string) => ({ value: fallback ?? _k }) }),
}))

const vuetify = createVuetify({ components, directives })

function makeConcept(id: number, overrides: Partial<Concept> = {}): Concept {
  return {
    conceptId: id,
    conceptName: `Concept ${id}`,
    conceptCode: `${id}`,
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...overrides,
  }
}

describe('IncludedConceptsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('renders rows from items prop', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(1), makeConcept(2)],
        loading: false,
        error: null,
        manualCount: 1,
        sourceKey: 'SYNPUF1K',
      },
    })
    expect(wrapper.text()).toContain('Concept 1')
    expect(wrapper.text()).toContain('Concept 2')
  })

  it('renders the "empty manual" copy when manualCount === 0', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items: [], loading: false, error: null, manualCount: 0 },
    })
    expect(wrapper.text()).toMatch(/Add concepts on the Selected tab/i)
  })

  it('renders the "no resolved concepts" copy when manualCount > 0 and items is empty', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: { items: [], loading: false, error: null, manualCount: 3 },
    })
    expect(wrapper.text()).toMatch(/No concepts resolved/i)
  })

  it('renders error alert and emits retry on click', async () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [],
        loading: false,
        error: 'HTTP 500: boom',
        manualCount: 2,
      },
    })
    expect(wrapper.text()).toMatch(/boom/i)
    await wrapper.get('[data-testid="included-retry-btn"]').trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('emits view-concept when a concept name is clicked', async () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(42)],
        loading: false,
        error: null,
        manualCount: 1,
        sourceKey: 'SYNPUF1K',
      },
    })
    await wrapper.get('[data-testid="included-name-link-42"]').trigger('click')
    expect(wrapper.emitted('view-concept')).toEqual([
      [{ conceptId: 42, sourceKey: 'SYNPUF1K' }],
    ])
  })

  it('renders the concept name as plain text (no link) when sourceKey is undefined', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(7)],
        loading: false,
        error: null,
        manualCount: 1,
      },
    })
    expect(wrapper.find('[data-testid="included-name-link-7"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Concept 7')
  })

  it('does not render any descendants/mapped/exclude checkbox columns', () => {
    const wrapper = mount(IncludedConceptsTable, {
      global: { plugins: [vuetify] },
      props: {
        items: [makeConcept(1)],
        loading: false,
        error: null,
        manualCount: 1,
      },
    })
    expect(wrapper.find('input[type="checkbox"]').exists()).toBe(false)
  })
})
