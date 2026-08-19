import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, type App, ref, reactive } from 'vue'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import ConceptArray from '@/components/circe/input/ConceptArray.vue'
import EventConceptSet from '@/components/circe/input/EventConceptSet.vue'
import TextFilter from '@/components/circe/input/TextFilter.vue'
import {
  CriteriaSelectionKey,
  type CriteriaSelectionService,
} from '@/composables/useCriteriaSelection'
import type { Concept } from '@/models/circe-types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function makeSelectionService() {
  const service: CriteriaSelectionService = {
    requestConceptSet: vi.fn(),
    requestConcepts: vi.fn(),
    editConceptSet: vi.fn(),
  }

  return service
}

function selectionPlugin(service: CriteriaSelectionService) {
  return {
    install(app: App) {
      app.provide(CriteriaSelectionKey, service)
    },
  }
}

function mountConceptArray(
  props: Record<string, unknown>,
  service: CriteriaSelectionService
) {
  return mount(ConceptArray, {
    props,
    global: {
      plugins: [vuetify, selectionPlugin(service)],
    },
  })
}

function mountEventConceptSet(props: Record<string, unknown>) {
  return mount(EventConceptSet, {
    props,
    global: {
      plugins: [vuetify],
    },
  })
}

function mountTextFilter(props: Record<string, unknown>) {
  return mount(TextFilter, {
    props,
    global: {
      plugins: [vuetify],
    },
  })
}

describe('Shared input controls', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ConceptArray', () => {
    it('requests concepts through the injected picker and merges unique selections back into the binding', async () => {
      const concepts = ref<Concept[]>([
        { CONCEPT_ID: 100, CONCEPT_NAME: 'Alpha' } as Concept,
      ])
      const exclude = ref(false)
      let requestConceptsCallback: ((concepts: Concept[]) => void) | undefined
      const service: CriteriaSelectionService = {
        requestConceptSet: vi.fn(),
        requestConcepts: vi.fn((domainFilter, onSelect) => {
          expect(domainFilter).toBe('Gender')
          requestConceptsCallback = onSelect
        }),
        editConceptSet: vi.fn(),
      }

      const wrapper = mountConceptArray(
        {
          binding: {
            concepts,
            exclude,
          },
          domainFilter: 'Gender',
        },
        service
      )

      await wrapper.get('.concept-array__select-button').trigger('click')

      expect(service.requestConcepts).toHaveBeenCalledTimes(1)
      requestConceptsCallback?.([
        { CONCEPT_ID: 100, CONCEPT_NAME: 'Alpha duplicate' } as Concept,
        { CONCEPT_ID: 200, CONCEPT_NAME: 'Beta' } as Concept,
        { CONCEPT_ID: 200, CONCEPT_NAME: 'Beta duplicate' } as Concept,
        { CONCEPT_NAME: 'Ignored because it has no id' } as Concept,
      ])
      await nextTick()

      expect(concepts.value).toEqual([
        { CONCEPT_ID: 100, CONCEPT_NAME: 'Alpha' },
        { CONCEPT_ID: 200, CONCEPT_NAME: 'Beta' },
      ])
      expect(wrapper.text()).toContain('100 - Alpha')
      expect(wrapper.text()).toContain('200 - Beta')
    })

    it('uses the standalone modelValue path when no binding is supplied', async () => {
      const service = makeSelectionService()
      let requestConceptsCallback: ((concepts: Concept[]) => void) | undefined

      service.requestConcepts = vi.fn((domainFilter, onSelect) => {
        expect(domainFilter).toBeUndefined()
        requestConceptsCallback = onSelect
      })

      const wrapper = mountConceptArray(
        {
          modelValue: [{ CONCEPT_ID: 11, CONCEPT_NAME: 'Alpha' } as Concept],
        },
        service
      )

      expect(wrapper.text()).toContain('11 - Alpha')

      await wrapper.get('.concept-array__select-button').trigger('click')
      requestConceptsCallback?.([
        { CONCEPT_ID: 11, CONCEPT_NAME: 'Duplicate alpha' } as Concept,
        { CONCEPT_ID: 22, CONCEPT_NAME: 'Beta' } as Concept,
      ])
      await nextTick()

      expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
        { CONCEPT_ID: 11, CONCEPT_NAME: 'Alpha' },
        { CONCEPT_ID: 22, CONCEPT_NAME: 'Beta' },
      ])

      const conceptChip = wrapper
        .findAllComponents({ name: 'AtlasChip' })
        .find(component => component.props('closable'))
      expect(conceptChip).toBeDefined()
      conceptChip?.findComponent({ name: 'VChip' }).vm.$emit('click:close', new MouseEvent('click'))
      await nextTick()

      expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBeUndefined()
    })

    it('does nothing when the criteria-selection service is absent', async () => {
      const wrapper = mount(ConceptArray, {
        props: {
          modelValue: [{ CONCEPT_ID: 99, CONCEPT_NAME: 'Lonely' } as Concept],
        },
        global: {
          plugins: [vuetify],
        },
      })

      expect(wrapper.text()).toContain('99 - Lonely')
      await wrapper.get('.concept-array__select-button').trigger('click')

      expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    })

    it('removes a selected concept and toggles the exclude flag when the binding exposes it', async () => {
      const concepts = ref<Concept[]>([
        { CONCEPT_ID: 42, CONCEPT_NAME: 'Gamma' } as Concept,
      ])
      const exclude = ref(false)
      const service = makeSelectionService()

      const wrapper = mountConceptArray(
        {
          binding: {
            concepts,
            exclude,
          },
        },
        service
      )

      const conceptChip = wrapper
        .findAllComponents({ name: 'AtlasChip' })
        .find(component => component.props('closable'))
      expect(conceptChip).toBeDefined()
      conceptChip?.findComponent({ name: 'VChip' }).vm.$emit('click:close', new MouseEvent('click'))
      await nextTick()
      expect(concepts.value).toBeUndefined()
      expect(wrapper.text()).toContain('No concepts selected')

      await wrapper.get('.concept-array__exclude-chip').trigger('click')
      expect(exclude.value).toBe(true)
    })
  })

  describe('EventConceptSet', () => {
    it('emits select when no concept set is selected', async () => {
      const wrapper = mountEventConceptSet({
        conceptSets: [{ id: 7, name: 'Test Set' }],
      })

      await wrapper.get('button[data-testid="concept-set-picker"]').trigger('click')

      expect(wrapper.emitted('select')?.[0]).toEqual([undefined])
    })

    it('writes clears and edits through the targetRef when a concept set is already selected', async () => {
      const modelValue = reactive({ CodesetId: 7, IsExclusion: false })
      const wrapper = mountEventConceptSet({
        conceptSets: [{ id: 7, name: 'Test Set' }],
        modelValue,
      })

      expect(wrapper.text()).toContain('Test Set')

      await wrapper.findComponent({ name: 'AtlasChip' }).findComponent({ name: 'VChip' }).vm.$emit('click', new MouseEvent('click'))
      await nextTick()
      const editTarget = wrapper.emitted('edit')?.[0]?.[0] as { targetRef?: { value?: unknown } }
      expect(editTarget?.targetRef?.value).toBe(7)

      await wrapper.findComponent({ name: 'AtlasChip' }).findComponent({ name: 'VChip' }).vm.$emit('click:close', new MouseEvent('click'))
      await nextTick()
      expect(modelValue.CodesetId).toBeUndefined()
      expect(wrapper.emitted('clear')).toBeTruthy()
    })
  })

  describe('TextFilter', () => {
    it('writes operator and text updates back into the same model and ignores nullish operator updates', async () => {
      const modelValue = reactive({
        Op: 'contains' as const,
        Text: 'alpha',
      })

      const wrapper = mountTextFilter({ modelValue })
      const select = wrapper.findComponent({ name: 'AtlasSelect' })
      const textField = wrapper.findComponent({ name: 'AtlasTextField' })

      await select.vm.$emit('update:modelValue', null)
      await nextTick()
      expect(modelValue.Op).toBe('contains')

      await select.vm.$emit('update:modelValue', '!startsWith')
      await nextTick()
      expect(modelValue.Op).toBe('!startsWith')

      await textField.vm.$emit('update:modelValue', '')
      await nextTick()
      expect(modelValue.Text).toBeUndefined()

      await textField.vm.$emit('update:modelValue', 'beta')
      await nextTick()
      expect(modelValue.Text).toBe('beta')
    })
  })
})