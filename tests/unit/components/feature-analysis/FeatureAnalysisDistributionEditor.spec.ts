import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'

import FeatureAnalysisDistributionEditor from '@/components/feature-analysis/FeatureAnalysisDistributionEditor.vue'
import type { FeatureAnalysisAggregate, FeatureAnalysisDistributionItem } from '@/models/feature-analysis.types'
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
  design: FeatureAnalysisDistributionItem[] = [],
  conceptSets: ConceptSet[] = [],
  aggregates: FeatureAnalysisAggregate[] = [defaultAggregate]
) {
  return mount(FeatureAnalysisDistributionEditor, {
    props: { design, conceptSets, aggregates },
    global: {
      plugins: [vuetify],
      stubs: {
        AtlasMenu: {
          name: 'AtlasMenu',
          template: '<div><slot name="activator" :props="{}" /><div class="menu-content"><slot /></div></div>',
        },
        AtlasList: {
          name: 'AtlasList',
          template: '<div><slot /></div>',
        },
        AtlasListItem: {
          name: 'AtlasListItem',
          props: ['title', 'subtitle'],
          emits: ['click'],
          template: '<button class="stub-list-item" @click="$emit(\'click\')">{{ title }} {{ subtitle }}</button>',
        },
        AggrecateSelect: {
          name: 'AggrecateSelect',
          template: '<div data-testid="aggregate-select-stub" />',
        },
        WindowCriteria: {
          name: 'WindowCriteria',
          template:
            '<div><button data-testid="window-edit-concept-set" @click="$emit(\'edit-concept-set\', { targetRef: { value: 9 } })">edit</button><button data-testid="window-clear-concept-set" @click="$emit(\'clear-concept-set\')">clear</button></div>',
        },
        DemographicCriteria: {
          name: 'DemographicCriteria',
          template:
            '<div><button data-testid="demographic-edit-concept-set" @click="$emit(\'edit-concept-set\', { targetRef: { value: 9 } })">edit</button></div>',
        },
        ConceptSetSelectionDialog: {
          name: 'ConceptSetSelectionDialog',
          emits: ['local-concept-set-selected', 'concept-set-selected', 'create-new', 'update:modelValue'],
          template:
            '<div><button data-testid="concept-set-edit" @click="$emit(\'concept-set-selected\', { id: 9, name: \'Edited set\', items: [{ concept: { CONCEPT_ID: 1, CONCEPT_NAME: \'X\' } }] })">edit</button><button data-testid="concept-set-create" @click="$emit(\'create-new\')">create</button></div>',
        },
        ConceptSetEditor: {
          name: 'ConceptSetEditor',
          emits: ['apply', 'update:modelValue'],
          template:
            '<div><button data-testid="concept-set-editor-apply" @click="$emit(\'apply\', { name: \'Saved concept set\', items: [{ concept: { CONCEPT_ID: 2, CONCEPT_NAME: \'Y\' }, isExcluded: false, includeDescendants: false, includeMapped: false }] })">apply</button></div>',
        },
      },
    },
  })
}

describe('FeatureAnalysisDistributionEditor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    conceptSetsStoreMock.editorOpen.value = false
    conceptSetsStoreMock.currentSet.value = null
  })

  it('adds windowed and demographic criteria rows from the menu', async () => {
    const design: FeatureAnalysisDistributionItem[] = []
    const wrapper = mountEditor(design)

    await wrapper.findAll('.stub-list-item')[0].trigger('click')
    expect(design).toHaveLength(1)
    expect(design[0].criteriaType).toBe('WindowedCriteria')
    expect(design[0].aggregate).toEqual(defaultAggregate)

    await wrapper.findAll('.stub-list-item').at(-1)!.trigger('click')
    expect(design).toHaveLength(2)
    expect(design[1].criteriaType).toBe('DemographicCriteria')
  })

  it('mutates the row name, opens the embedded editor, and applies changes back into concept sets', async () => {
    const design: FeatureAnalysisDistributionItem[] = [
      {
        name: 'A',
        criteriaType: 'WindowedCriteria',
        aggregate: { ...defaultAggregate },
        expression: {
          Criteria: { Type: 'ALL', CriteriaList: [] },
          StartWindow: { Type: 'EVERY_RECORD', Number: 0 },
          RestrictVisit: false,
          IgnoreObservationPeriod: true,
        },
      },
    ]
    const conceptSets: ConceptSet[] = [
      {
        id: 9,
        name: 'Edited set',
        expression: { items: [] },
      },
    ]
    const wrapper = mountEditor(design, conceptSets)

    await wrapper.find('[data-testid="fa-distribution-row-0-name"] input').setValue('Renamed row')
    expect(design[0].name).toBe('Renamed row')

    await wrapper.get('[data-testid="window-edit-concept-set"]').trigger('click')
    expect(conceptSetsStoreMock.openEmbeddedEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 9,
        name: 'Edited set',
      })
    )
    expect(conceptSetsStoreMock.editorOpen.value).toBe(true)

    await wrapper.get('[data-testid="concept-set-editor-apply"]').trigger('click')
    await flushPromises()

    expect(conceptSets).toHaveLength(2)
    expect(conceptSets[1].name).toBe('Saved concept set')
    expect(conceptSets[1].expression?.items).toHaveLength(1)
  })

  it('removes a row and clears a selection when requested', async () => {
    const design: FeatureAnalysisDistributionItem[] = [
      {
        name: 'A',
        criteriaType: 'WindowedCriteria',
        aggregate: { ...defaultAggregate },
        expression: {
          Criteria: { Type: 'ALL', CriteriaList: [] },
          StartWindow: { Type: 'EVERY_RECORD', Number: 0 },
          RestrictVisit: false,
          IgnoreObservationPeriod: true,
        },
      },
      {
        name: 'B',
        criteriaType: 'DemographicCriteria',
        aggregate: undefined,
        expression: {},
      },
    ]
    const wrapper = mountEditor(design)

    await wrapper.get('[data-testid="window-clear-concept-set"]').trigger('click')
    await wrapper.get('[data-testid="fa-distribution-row-0-delete"]').trigger('click')

    expect(design).toHaveLength(1)
    expect(design[0].name).toBe('B')
  })
})