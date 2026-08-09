import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import ConceptTable from '@/components/concepts/ConceptTable.vue'
import type { Concept } from '@/models/concept-set.types'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeConcept(overrides: Partial<Concept> = {}): Concept {
  return {
    conceptId: 1,
    conceptName: 'Test Concept',
    conceptCode: 'T1',
    domainId: 'Condition',
    vocabularyId: 'SNOMED',
    conceptClassId: 'Clinical Finding',
    standardConcept: 'S',
    invalidReason: null,
    ...overrides,
  }
}

const sampleConcepts: Concept[] = [
  makeConcept({ conceptId: 100, conceptName: 'Diabetes', conceptCode: 'D1' }),
  makeConcept({ conceptId: 200, conceptName: 'Hypertension', conceptCode: 'H1' }),
  makeConcept({ conceptId: 300, conceptName: 'Asthma', conceptCode: 'A1' }),
]

interface MountOptions {
  selectable?: boolean
  selected?: number[]
  showAddButton?: boolean
  conceptsInSet?: Set<number>
  concepts?: Concept[]
}

function createWrapper(opts: MountOptions = {}) {
  return mount(ConceptTable, {
    props: {
      concepts: opts.concepts ?? sampleConcepts,
      totalItems: (opts.concepts ?? sampleConcepts).length,
      page: 1,
      itemsPerPage: 60,
      selectable: opts.selectable ?? false,
      selected: opts.selected ?? [],
      showAddButton: opts.showAddButton ?? false,
      conceptsInSet: opts.conceptsInSet ?? new Set<number>(),
    },
    global: {
      plugins: [vuetify, createPinia()],
    },
  })
}

describe('ConceptTable selection', () => {
  it('renders no checkbox column when selectable is false (default)', async () => {
    const wrapper = createWrapper({ selectable: false })
    await nextTick()

    // No data-table checkbox elements should be rendered
    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(false)

    const rowCheckboxes = wrapper.findAll('[data-testid^="concept-table-row-checkbox-"]')
    expect(rowCheckboxes.length).toBe(0)
  })

  it('renders checkbox column with selectable=true and none checked when selected is empty', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await nextTick()

    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(true)

    const rowCheckboxes = wrapper.findAll('[data-testid^="concept-table-row-checkbox-"]')
    expect(rowCheckboxes.length).toBe(sampleConcepts.length)

    // None should be checked
    for (const cb of rowCheckboxes) {
      const input = cb.find('input[type="checkbox"]')
      expect(input.exists()).toBe(true)
      expect((input.element as HTMLInputElement).checked).toBe(false)
    }
  })

  it('checks only the row whose conceptId is in selected', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [200] })
    await nextTick()

    const checked100 = wrapper.find('[data-testid="concept-table-row-checkbox-100"] input[type="checkbox"]')
    const checked200 = wrapper.find('[data-testid="concept-table-row-checkbox-200"] input[type="checkbox"]')
    const checked300 = wrapper.find('[data-testid="concept-table-row-checkbox-300"] input[type="checkbox"]')

    expect((checked100.element as HTMLInputElement).checked).toBe(false)
    expect((checked200.element as HTMLInputElement).checked).toBe(true)
    expect((checked300.element as HTMLInputElement).checked).toBe(false)
  })

  it('emits update:selected when a row checkbox is clicked', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await nextTick()

    const cb = wrapper.find('[data-testid="concept-table-row-checkbox-200"] input[type="checkbox"]')
    expect(cb.exists()).toBe(true)
    await cb.setValue(true)
    await nextTick()

    const events = wrapper.emitted('update:selected')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as number[]
    expect(last).toContain(200)
  })

  it('emits update:selected with all visible conceptIds when header checkbox toggled on', async () => {
    const wrapper = createWrapper({ selectable: true, selected: [] })
    await nextTick()

    const header = wrapper.find('[data-testid="concept-table-select-all"] input[type="checkbox"]')
    expect(header.exists()).toBe(true)
    await header.setValue(true)
    await nextTick()

    const events = wrapper.emitted('update:selected')
    expect(events).toBeTruthy()
    const last = events![events!.length - 1][0] as number[]
    expect(last.sort()).toEqual([100, 200, 300])
  })

  it('coexists with showAddButton; clicking Add still emits add-concept', async () => {
    const wrapper = createWrapper({
      selectable: true,
      selected: [],
      showAddButton: true,
      conceptsInSet: new Set<number>(),
    })
    await nextTick()

    // checkbox column exists
    const headerCheckbox = wrapper.find('[data-testid="concept-table-select-all"]')
    expect(headerCheckbox.exists()).toBe(true)

    // Click an Add button
    const addButtons = wrapper.findAll('button').filter((b) => b.text().includes('Add'))
    expect(addButtons.length).toBeGreaterThan(0)
    await addButtons[0].trigger('click')
    await nextTick()

    expect(wrapper.emitted('add-concept')).toBeTruthy()
  })
})
