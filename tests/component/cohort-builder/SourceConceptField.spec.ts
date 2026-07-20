/**
 * Component Test: source-concept reference control on CriteriaEventCard
 *
 * Mount harness copied verbatim from
 * tests/component/cohort-builder/CriteriaEventCard.spec.ts.
 */
import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
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
import { configLoaderService } from '@/services/config-loader.service'
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

describe('CriteriaEventCard — source concept as attribute row', () => {
  beforeAll(async () => {
    await configLoaderService.loadConfiguration()
  })

  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders no source-concept UI in the header', () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )
    expect(wrapper.find('.event-header [data-testid="source-concept-selected"]').exists()).toBe(false)
    expect(wrapper.find('.event-header [data-testid="source-concept-picker"]').exists()).toBe(false)
  })

  it('renders an attribute row when sourceConceptId is set', () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )
    const row = wrapper.find('[data-testid="source-concept-row"]')
    expect(row.exists()).toBe(true)
    expect(row.text().toLowerCase()).toContain('source concept')
    expect(row.find('[data-testid="source-concept-selected"]').exists()).toBe(true)
  })

  it('renders no row when sourceConceptId is unset', () => {
    const wrapper = createWrapper(makeEvent({ criteriaType: 'VisitOccurrence' }))
    expect(wrapper.find('[data-testid="source-concept-row"]').exists()).toBe(false)
  })

  it('renders no row for criteria types without source-concept support', () => {
    const wrapper = createWrapper(makeEvent({ criteriaType: 'ConditionEra' }))
    expect(wrapper.find('[data-testid="source-concept-row"]').exists()).toBe(false)
  })

  it('adds a pending row via the add-attribute menu, then stores the picked id', async () => {
    let deliver: ((cs: ConceptSetReference) => void) | undefined
    const selection: CriteriaSelectionService = {
      requestConceptSet: vi.fn(cb => {
        deliver = cb
      }),
      requestConcepts: vi.fn(),
      editConceptSet: vi.fn(),
    }
    const wrapper = mount(CriteriaEventCard, {
      global: {
        plugins: [vuetify],
        provide: { [CriteriaSelectionKey as symbol]: selection },
      },
      props: {
        event: makeEvent({ criteriaType: 'ConditionOccurrence' }),
        section: 'criteriaGroup',
      },
      attachTo: document.body,
    })

    await wrapper.find('[data-testid="add-attribute-button"]').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 50))

    const item = Array.from(document.body.querySelectorAll('.v-list-item')).find(el =>
      el.textContent?.toLowerCase().includes('source concept')
    )
    expect(item).toBeDefined()
    ;(item as HTMLElement).click()
    await wrapper.vm.$nextTick()

    const picker = wrapper.find('[data-testid="source-concept-picker"]')
    expect(picker.exists()).toBe(true)
    expect(wrapper.emitted('update')).toBeUndefined()

    await picker.trigger('click')
    expect(selection.requestConceptSet).toHaveBeenCalledTimes(1)

    deliver?.({ id: 8, name: 'Condition source concepts', items: [] })
    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    expect((updates![0]![0] as CohortEvent).sourceConceptId).toBe(8)

    wrapper.unmount()
  })

  it('clears sourceConceptId via the row delete button', async () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )
    await wrapper.find('[data-testid="remove-source-concept-attribute"]').trigger('click')
    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    expect((updates![0]![0] as CohortEvent).sourceConceptId).toBeUndefined()
  })

  it('clears sourceConceptId via the chip close icon', async () => {
    const wrapper = createWrapper(
      makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })
    )
    await wrapper
      .find('[data-testid="source-concept-selected"] .v-chip__close')
      .trigger('click')
    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    expect((updates![0]![0] as CohortEvent).sourceConceptId).toBeUndefined()
  })

  it('survives convertInternalToAtlas as VisitSourceConcept', () => {
    const cohort = createMinimalCohort({
      entryEvents: [makeEvent({ criteriaType: 'VisitOccurrence', sourceConceptId: 8 })],
    })
    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ VisitOccurrence: Record<string, unknown> }> }
    }
    expect(atlas.PrimaryCriteria.CriteriaList[0]!.VisitOccurrence.VisitSourceConcept).toBe(8)
  })
})
