/**
 * EntryEventsList Component Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EntryEventsList from '@/components/cohort/EntryEventsList.vue'
import type { CohortEvent, ObservationPeriod } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/composables/useFilterConfig', () => ({
  useFilterConfig: () => ({
    availableFilters: [
      {
        criteriaType: 'ConditionOccurrence',
        name: 'Condition Occurrence',
        description: 'Filter by condition occurrence'
      },
      {
        criteriaType: 'DrugExposure',
        name: 'Drug Exposure',
        description: 'Filter by drug exposure'
      }
    ]
  })
}))

const vuetify = createVuetify({ components, directives })

const mockObservationPeriod: ObservationPeriod = {
  priorDays: 365,
  postDays: 0
}

const mockEvent: CohortEvent = {
  id: 'event-1',
  criteriaType: 'ConditionOccurrence',
  attributes: []
}

function mountComponent(props = {}) {
  return mount(EntryEventsList, {
    props: {
      events: [],
      observationPeriod: mockObservationPeriod,
      ...props
    },
    global: {
      plugins: [vuetify],
      stubs: {
        CriteriaEventCard: {
          template: '<div class="criteria-event-card"><slot /></div>',
          props: ['event']
        }
      }
    }
  })
}

describe('EntryEventsList', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should mount successfully', () => {
      const wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should not render the legacy vertical "ALL" sticker', () => {
      // Refresh: the section header's qualifying-limit toggle is
      // the source of truth; the vertical sideways-lr label was
      // retired here and in InclusionCriteriaPanel.
      const wrapper = mountComponent()
      expect(wrapper.find('.vertical-label').exists()).toBe(false)
    })

    it('renders a greyed, non-interactive ANY match-type label (#100)', () => {
      const wrapper = mountComponent()
      const label = wrapper.find('[data-testid="entry-any-label"]')
      expect(label.exists()).toBe(true)
      expect(label.text()).toMatch(/any/i)
      // Non-interactive: it communicates the implicit OR, it is not a control.
      expect(label.attributes('aria-disabled')).toBe('true')
    })

    it('should render add entry event button', () => {
      const wrapper = mountComponent()
      const addBtn = wrapper.find('[data-testid="add-entry-event"]')
      expect(addBtn.exists()).toBe(true)
    })

    it('should render observation period chip', () => {
      const wrapper = mountComponent()
      const chips = wrapper.findAllComponents({ name: 'VChip' })
      expect(chips.length).toBeGreaterThan(0)
    })

    it('should render event cards for each event', () => {
      const wrapper = mountComponent({
        events: [mockEvent, { ...mockEvent, id: 'event-2' }]
      })

      const eventCards = wrapper.findAll('.criteria-event-card')
      expect(eventCards.length).toBe(2)
    })
  })

  describe('Props', () => {
    it('should accept events prop', () => {
      const events = [mockEvent]
      const wrapper = mountComponent({ events })
      expect(wrapper.props('events')).toEqual(events)
    })

    it('should accept observationPeriod prop', () => {
      const period = { priorDays: 90, postDays: 30 }
      const wrapper = mountComponent({ observationPeriod: period })
      expect(wrapper.props('observationPeriod')).toEqual(period)
    })

    it('should handle empty events array', () => {
      const wrapper = mountComponent({ events: [] })
      const eventCards = wrapper.findAll('.criteria-event-card')
      expect(eventCards.length).toBe(0)
    })
  })

  describe('Continuous observation popover', () => {
    it('renders the continuous-observation pill', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VChip' }).exists()).toBe(true)
    })

    it('uses an anchored menu rather than a page-dimming dialog (discussion #99)', () => {
      const wrapper = mountComponent()
      expect(wrapper.findComponent({ name: 'VMenu' }).exists()).toBe(true)
      expect(wrapper.findComponent({ name: 'VDialog' }).exists()).toBe(false)
    })
  })

  describe('Events', () => {
    it('should emit update:events when adding new event', async () => {
      const wrapper = mountComponent()

      // The filter menu content is lazy: it only mounts once the
      // "add criteria" button opens it.
      await wrapper.find('[data-testid="add-entry-event"]').trigger('click')
      await wrapper.vm.$nextTick()

      const listItems = wrapper.findAllComponents({ name: 'VListItem' })
      expect(listItems.length).toBeGreaterThan(0)

      await listItems[0].trigger('click')
      await wrapper.vm.$nextTick()

      expect(wrapper.emitted('update:events')).toBeTruthy()
    })
  })
})
