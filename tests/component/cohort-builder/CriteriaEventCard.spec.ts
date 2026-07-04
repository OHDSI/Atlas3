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
import {
  CriteriaSelectionKey,
  type CriteriaSelectionService,
} from '@/composables/useCriteriaSelection'
import type { CohortEvent, ConceptSetReference } from '@/models/cohort.types'

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

describe('CriteriaEventCard — concept-set selection', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('requests the concept set via the selection service and applies the result', async () => {
    let deliver: ((cs: ConceptSetReference) => void) | undefined
    const selection: CriteriaSelectionService = {
      requestConceptSet: vi.fn(cb => {
        deliver = cb
      }),
      requestConcepts: vi.fn(),
      editConceptSet: vi.fn(),
    }
    const wrapper = createWrapper(makeEvent(), selection)

    await wrapper.find('[data-testid="concept-set-picker"]').trigger('click')

    expect(selection.requestConceptSet).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('select-concept-set')).toBeFalsy()

    // The owner delivers the picked set; the card applies it through its
    // ordinary update emit — this is what makes selection depth-independent.
    const picked: ConceptSetReference = { id: 4, name: 'Diabetes', items: [] }
    deliver?.(picked)
    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    expect((updates![0]![0] as CohortEvent).conceptSet).toEqual(picked)
  })

  it('falls back to the legacy select-concept-set emit without a service', async () => {
    const wrapper = createWrapper(makeEvent())

    await wrapper.find('[data-testid="concept-set-picker"]').trigger('click')

    expect(wrapper.emitted('select-concept-set')).toBeTruthy()
  })

  it('opens the editor via the selection service when the chip is clicked', async () => {
    const selection: CriteriaSelectionService = {
      requestConceptSet: vi.fn(),
      requestConcepts: vi.fn(),
      editConceptSet: vi.fn(),
    }
    const conceptSet = { id: 9, name: 'Hypertension', items: [] }
    const wrapper = createWrapper(makeEvent({ conceptSet }), selection)

    await wrapper.find('[data-testid="selected-concept-set"]').trigger('click')

    expect(selection.editConceptSet).toHaveBeenCalledWith(conceptSet)
    expect(wrapper.emitted('edit-concept-set')).toBeFalsy()
  })

  it('falls back to the legacy edit-concept-set emit without a service', async () => {
    const conceptSet = { id: 9, name: 'Hypertension', items: [] }
    const wrapper = createWrapper(makeEvent({ conceptSet }))

    await wrapper.find('[data-testid="selected-concept-set"]').trigger('click')

    expect(wrapper.emitted('edit-concept-set')).toBeTruthy()
    expect(wrapper.emitted('edit-concept-set')![0]).toEqual([conceptSet])
  })
})
