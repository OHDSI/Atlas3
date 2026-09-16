/**
 * FeatureAnalysisPrevalenceEditor component tests
 *
 * Prevalence rows are always CriteriaGroup-shaped: confirm add/remove of
 * rows works and that a freshly-added row gets an empty CriteriaGroup
 * expression ready for CriteriaGroup.vue to edit.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

import FeatureAnalysisPrevalenceEditor from '@/components/feature-analyses/FeatureAnalysisPrevalenceEditor.vue'
import type { FeatureAnalysisAggregate, FeatureAnalysisCriteriaGroupItem } from '@/models/feature-analysis.types'
import type { ConceptSet } from '@/models/circe-types'

const conceptSetsStoreMock = {
  editorOpen: ref(false),
  currentSet: ref(null as null | { id?: number | string; name: string; items?: unknown[] }),
  openEmbeddedEditor: vi.fn((set: { id?: number | string; name: string; items?: unknown[] }) => {
    conceptSetsStoreMock.editorOpen.value = true
    conceptSetsStoreMock.currentSet.value = set
  }),
  openCreateEditor: vi.fn(() => {
    conceptSetsStoreMock.editorOpen.value = true
    conceptSetsStoreMock.currentSet.value = { name: '', items: [] }
  }),
  closeEditor: vi.fn(() => {
    conceptSetsStoreMock.editorOpen.value = false
    conceptSetsStoreMock.currentSet.value = null
  }),
}

vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => conceptSetsStoreMock,
}))

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const defaultAggregate: FeatureAnalysisAggregate = {
  id: 99,
  name: 'Default aggregate',
  isDefault: true,
}

function mountEditor(
  design: FeatureAnalysisCriteriaGroupItem[] = [],
  conceptSets: ConceptSet[] = [],
  aggregates: FeatureAnalysisAggregate[] = [defaultAggregate]
) {
  return mount(FeatureAnalysisPrevalenceEditor, {
    props: { design, conceptSets, aggregates },
    global: {
      plugins: [vuetify],
      stubs: {
        // Real CriteriaGroup pulls in the whole circe editor tree; a thin
        // stub that can mutate its `group` prop is enough to prove wiring.
        CriteriaGroup: {
          name: 'CriteriaGroup',
          props: ['group', 'conceptSets'],
          template:
            '<button data-testid="criteria-group-mutate" @click="group.Type = \'ANY\'">mutate</button>',
        },
        ConceptSetSelectionDialog: {
          name: 'ConceptSetSelectionDialog',
          emits: ['edit-concept-set', 'create-new', 'local-concept-set-selected', 'concept-set-selected', 'update:modelValue'],
          template:
            '<div><button data-testid="concept-set-edit" @click="$emit(\'edit-concept-set\', { id: 9, name: \'Edited set\', items: [{ conceptId: 1, conceptName: \'X\', conceptCode: \'\', domainId: \'Drug\', vocabularyId: \'SNOMED\', conceptClassId: \'Ingredient\', standardConcept: null, invalidReason: null, isExcluded: false, includeDescendants: true, includeMapped: false }] })">edit</button><button data-testid="concept-set-create" @click="$emit(\'create-new\')">create</button><button data-testid="concept-set-apply" @click="$emit(\'edit-concept-set\', { id: 9, name: \'Edited set\', items: [{ conceptId: 1, conceptName: \'X\', conceptCode: \'\', domainId: \'Drug\', vocabularyId: \'SNOMED\', conceptClassId: \'Ingredient\', standardConcept: null, invalidReason: null, isExcluded: false, includeDescendants: true, includeMapped: false }] })">apply</button></div>',
        },
        ConceptSetEditor: {
          name: 'ConceptSetEditor',
          emits: ['apply', 'update:modelValue'],
          template:
            '<div><button data-testid="concept-set-editor-apply" @click="$emit(\'apply\', { name: \'Saved concept set\', items: [{ conceptId: 2, conceptName: \'Y\', conceptCode: \'\', domainId: \'Drug\', vocabularyId: \'SNOMED\', conceptClassId: \'Ingredient\', standardConcept: null, invalidReason: null, isExcluded: false, includeDescendants: false, includeMapped: false }] })">apply</button></div>',
        },
      },
    },
  })
}

describe('FeatureAnalysisPrevalenceEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    conceptSetsStoreMock.editorOpen.value = false
    conceptSetsStoreMock.currentSet.value = null
  })

  it('shows an empty placeholder when there are no rows', () => {
    const wrapper = mountEditor([])
    expect(wrapper.text()).toContain('No criteria features yet.')
  })

  it('Add Criteria feature appends a CriteriaGroup row', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = []
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="fa-prevalence-add-criteria"]').trigger('click')

    expect(design).toHaveLength(1)
    expect(design[0].criteriaType).toBe('CriteriaGroup')
    expect(design[0].aggregate).toEqual(defaultAggregate)
    expect(design[0].expression).toEqual({
      Type: 'ALL',
      CriteriaList: [],
      DemographicCriteriaList: [],
      Groups: [],
    })
    expect(wrapper.find('[data-testid="fa-prevalence-row-0"]').exists()).toBe(true)
  })

  it('editing the row name mutates the underlying design array in place', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: '', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    const nameInput = wrapper.find('[data-testid="fa-prevalence-row-0-name"] input')
    await nameInput.setValue('Diabetes present')

    expect(design[0].name).toBe('Diabetes present')
  })

  it('delete removes the row from the design array', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: 'A', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
      { name: 'B', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="fa-prevalence-row-0-delete"]').trigger('click')

    expect(design).toHaveLength(1)
    expect(design[0].name).toBe('B')
  })

  it('a CriteriaGroup edit mutates the row expression object directly', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: 'A', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="criteria-group-mutate"]').trigger('click')

    expect(design[0].expression.Type).toBe('ANY')
  })

  it('edit concept set opens the embedded editor with the selected set', async () => {
    const design: FeatureAnalysisCriteriaGroupItem[] = [
      { name: 'A', criteriaType: 'CriteriaGroup', expression: { Type: 'ALL' } },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="concept-set-edit"]').trigger('click')

    expect(conceptSetsStoreMock.openEmbeddedEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        name: 'Edited set',
        items: expect.any(Array),
      })
    )
    expect(conceptSetsStoreMock.editorOpen.value).toBe(true)
  })

  it('create new concept set opens the concept set editor', async () => {
    const wrapper = mountEditor()

    await wrapper.get('[data-testid="concept-set-create"]').trigger('click')

    expect(conceptSetsStoreMock.openCreateEditor).toHaveBeenCalledTimes(1)
    expect(conceptSetsStoreMock.editorOpen.value).toBe(true)
  })

  it('applying concept set changes upserts the set into props.conceptSets', async () => {
    const conceptSets: ConceptSet[] = []
    const wrapper = mountEditor([], conceptSets)

    await wrapper.get('[data-testid="concept-set-edit"]').trigger('click')
    await wrapper.get('[data-testid="concept-set-editor-apply"]').trigger('click')

    expect(conceptSets).toHaveLength(1)
    expect(conceptSets[0].name).toBe('Saved concept set')
    expect(conceptSets[0].expression?.items).toHaveLength(1)
  })
})
