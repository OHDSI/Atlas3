import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import ConceptTable from '@/components/concepts/ConceptTable.vue'
import type { Concept } from '@/models/concept-set.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/stores/concept-detail-drawer', () => ({
  useConceptDetailDrawerStore: vi.fn(() => ({ open: vi.fn(), close: vi.fn(), isOpen: false })),
}))

vi.mock('@/stores/webapi', () => ({
  useWebAPIStore: vi.fn(() => ({ getValidVocabularySource: () => null })),
}))

function concept(conceptId: number, conceptName: string): Concept {
  return {
    conceptId,
    conceptName,
    conceptCode: String(conceptId),
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
  }
}

const concepts = [concept(1, 'Alpha'), concept(2, 'Beta'), concept(3, 'Gamma')]

function mountTable(props: Record<string, unknown> = {}) {
  return mount(ConceptTable, {
    props: { concepts, totalItems: 3, linkable: false, selectable: true, ...props },
    global: { plugins: [createVuetify({ components, directives })] },
  })
}

function rowFor(wrapper: ReturnType<typeof mountTable>, name: string) {
  const row = wrapper.findAll('tbody tr').find(tr => tr.text().includes(name))
  if (!row) throw new Error(`row ${name} not found`)
  return row
}

describe('ConceptTable row states', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('marks concepts already in the set with a row class and badge', () => {
    const wrapper = mountTable({ conceptsInSet: new Set([2]) })

    const inSet = rowFor(wrapper, 'Beta')
    expect(inSet.classes()).toContain('concept-table__row--in-set')
    expect(inSet.find('[data-testid="concept-in-set-2"]').exists()).toBe(true)

    const notInSet = rowFor(wrapper, 'Alpha')
    expect(notInSet.classes()).not.toContain('concept-table__row--in-set')
    expect(notInSet.find('[data-testid="concept-in-set-1"]').exists()).toBe(false)
  })

  it('updates the in-set marker when concepts are added or removed', async () => {
    const wrapper = mountTable({ conceptsInSet: new Set<number>() })
    expect(rowFor(wrapper, 'Gamma').classes()).not.toContain('concept-table__row--in-set')

    await wrapper.setProps({ conceptsInSet: new Set([3]) })
    expect(rowFor(wrapper, 'Gamma').classes()).toContain('concept-table__row--in-set')

    await wrapper.setProps({ conceptsInSet: new Set<number>() })
    expect(rowFor(wrapper, 'Gamma').classes()).not.toContain('concept-table__row--in-set')
  })

  it('keeps checkbox selection distinct from the in-set state', () => {
    const wrapper = mountTable({ conceptsInSet: new Set([2]), selected: [1, 2] })

    const selectedOnly = rowFor(wrapper, 'Alpha')
    expect(selectedOnly.classes()).toContain('concept-table__row--selected')
    expect(selectedOnly.classes()).not.toContain('concept-table__row--in-set')

    const both = rowFor(wrapper, 'Beta')
    expect(both.classes()).toEqual(
      expect.arrayContaining(['concept-table__row--selected', 'concept-table__row--in-set'])
    )

    const neither = rowFor(wrapper, 'Gamma')
    expect(neither.classes()).not.toContain('concept-table__row--selected')
    expect(neither.classes()).not.toContain('concept-table__row--in-set')
  })
})
