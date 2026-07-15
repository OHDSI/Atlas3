import { createPinia, setActivePinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Mock i18n composable with real translations
vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import CriteriaEventCard from '@/components/cohort-builder/CriteriaEventCard.vue'
import { convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition, CohortEvent } from '@/models/cohort.types'

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

// Mount harness copied from tests/component/cohort-builder/CriteriaEventCard.spec.ts
const createWrapper = (event: CohortEvent) => {
  return mount(CriteriaEventCard, {
    global: {
      plugins: [vuetify],
    },
    props: { event, section: 'criteriaGroup' },
  })
}

describe('CriteriaEventCard — bare type-exclude toggle', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders the bare toggle for an applicable criteria type with no type-concept attribute', () => {
    const wrapper = createWrapper(makeEvent({ typeExclude: false }))

    expect(wrapper.find('[data-testid="type-exclude-toggle"]').exists()).toBe(true)
  })

  it('toggling it sets event.typeExclude and survives convertInternalToAtlas as *TypeExclude', async () => {
    const wrapper = createWrapper(makeEvent({ typeExclude: false }))

    const toggle = wrapper.find('[data-testid="type-exclude-toggle"] input')
    await toggle.setValue(true)

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updatedEvent = updates![0]![0] as CohortEvent
    expect(updatedEvent.typeExclude).toBe(true)

    const cohort: CohortDefinition = {
      name: 'Type-exclude toggle cohort',
      description: '',
      conceptSets: [],
      entryEvents: [{ ...updatedEvent, conceptSet: { id: 0, name: 'x' } }],
      qualifyingLimit: 'ALL',
      expressionLimit: 'ALL',
      inclusionRules: [],
    } as unknown as CohortDefinition

    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> }
    }
    expect(atlas.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(true)
  })

  it('hides the bare toggle when a type-concept attribute with isExclusion is already present', () => {
    const wrapper = createWrapper(
      makeEvent({
        typeExclude: false,
        attributes: [
          {
            type: 'concept',
            attributeKey: 'conditionType',
            concepts: [{ CONCEPT_ID: 44786627, CONCEPT_NAME: 'Primary Condition' }],
            isExclusion: true,
          },
        ],
      }),
    )

    expect(wrapper.find('[data-testid="type-exclude-toggle"]').exists()).toBe(false)
  })

  it('hides the bare toggle for criteria types with no *TypeExclude key', () => {
    const wrapper = createWrapper(makeEvent({ criteriaType: 'LocationRegion' }))

    expect(wrapper.find('[data-testid="type-exclude-toggle"]').exists()).toBe(false)
  })
})
