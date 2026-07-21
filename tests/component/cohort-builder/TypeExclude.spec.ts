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

describe('CriteriaEventCard — type-exclude (2.15 parity: no bare toggle)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('never renders a bare type-exclude toggle, even for supported types', () => {
    const wrapper = createWrapper(makeEvent({ typeExclude: false }))
    expect(wrapper.find('[data-testid="type-exclude-toggle"]').exists()).toBe(false)
  })

  it('renders no toggle when a type-concept attribute is present either', () => {
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

  it('still round-trips a loaded typeExclude flag through convertInternalToAtlas', () => {
    const cohort: CohortDefinition = {
      name: 'Type-exclude round-trip cohort',
      description: '',
      conceptSets: [],
      entryEvents: [
        { ...makeEvent({ typeExclude: true }), conceptSet: { id: 0, name: 'x' } },
      ],
      qualifyingLimit: 'ALL',
      expressionLimit: 'ALL',
      inclusionRules: [],
    } as unknown as CohortDefinition

    const atlas = convertInternalToAtlas(cohort) as unknown as {
      PrimaryCriteria: { CriteriaList: Array<{ ConditionOccurrence: Record<string, unknown> }> }
    }
    expect(atlas.PrimaryCriteria.CriteriaList[0]!.ConditionOccurrence.ConditionTypeExclude).toBe(true)
  })
})
