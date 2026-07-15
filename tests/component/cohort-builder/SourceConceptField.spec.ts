/**
 * Component Test: source-concept reference control on CriteriaEventCard
 *
 * Mount harness copied verbatim from
 * tests/component/cohort-builder/CriteriaEventCard.spec.ts.
 */
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import CriteriaEventCard from '@/components/cohort-builder/CriteriaEventCard.vue'
import {
  CriteriaSelectionKey,
  type CriteriaSelectionService,
} from '@/composables/useCriteriaSelection'
import { convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition, CohortEvent, ConceptSetReference } from '@/models/cohort.types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function makeEvent(overrides: Partial<CohortEvent> = {}): CohortEvent {
  return {
    id: 'evt-1',
    criteriaType: 'ConditionOccurrence',
    attributes: [],
    ...overrides,
  }
}

function createMinimalCohort(overrides: Partial<CohortDefinition> = {}): CohortDefinition {
  return {
    name: 'Test Cohort',
    entryEvents: [],
    qualifyingLimit: 'ALL',
    inclusionRules: [],
    conceptSets: [],
    ...overrides,
  }
}

const createWrapper = (
  event: CohortEvent,
  selection?: CriteriaSelectionService
) => {
  return mount(CriteriaEventCard, {
    global: {
      plugins: [vuetify],
      provide: selection ? { [CriteriaSelectionKey as symbol]: selection } : {},
    },
    props: { event, section: 'criteriaGroup' },
  })
}

describe('CriteriaEventCard — source concept field', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders a source-concept field for VisitOccurrence (in SOURCE_CONCEPT_KEYS)', () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )

    expect(wrapper.text().toLowerCase()).toContain('source concept')
    expect(wrapper.find('[data-testid="source-concept-selected"]').exists()).toBe(true)
  })

  it('does not render a source-concept field for ConditionEra (not in SOURCE_CONCEPT_KEYS)', () => {
    const wrapper = createWrapper(makeEvent({ criteriaType: 'ConditionEra' }))

    expect(wrapper.text().toLowerCase()).not.toContain('source concept')
    expect(wrapper.find('[data-testid="source-concept-picker"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="source-concept-selected"]').exists()).toBe(false)
  })

  it('requests a source concept via the selection service and stores its numeric id', async () => {
    let deliver: ((cs: ConceptSetReference) => void) | undefined
    const selection: CriteriaSelectionService = {
      requestConceptSet: vi.fn(cb => {
        deliver = cb
      }),
      requestConcepts: vi.fn(),
      editConceptSet: vi.fn(),
    }
    const wrapper = createWrapper(makeEvent({ criteriaType: 'VisitOccurrence' }), selection)

    await wrapper.find('[data-testid="source-concept-picker"]').trigger('click')

    expect(selection.requestConceptSet).toHaveBeenCalledTimes(1)

    const picked: ConceptSetReference = { id: 8, name: 'Visit source concepts', items: [] }
    deliver?.(picked)

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updatedEvent = updates![0]![0] as CohortEvent
    expect(updatedEvent.sourceConceptId).toBe(8)
    expect(updatedEvent.conceptSet).toBeUndefined()
  })

  it('clears the source concept when the chip close icon is clicked', async () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )

    await wrapper
      .find('[data-testid="source-concept-selected"] .v-chip__close')
      .trigger('click')

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updatedEvent = updates![0]![0] as CohortEvent
    expect(updatedEvent.sourceConceptId).toBeUndefined()
  })

  it('survives convertInternalToAtlas as VisitSourceConcept', () => {
    const cohort = createMinimalCohort({
      entryEvents: [
        makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 }),
      ],
    })

    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ VisitOccurrence: Record<string, unknown> }> }
    }

    expect(atlas.PrimaryCriteria.CriteriaList[0]!.VisitOccurrence.VisitSourceConcept).toBe(8)
  })
})
