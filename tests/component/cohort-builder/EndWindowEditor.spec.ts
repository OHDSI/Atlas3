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
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'
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
    criteriaType: 'DrugExposure',
    attributes: [],
    ...overrides,
  }
}

const createWrapper = (event: CohortEvent) => {
  return mount(CriteriaEventCard, {
    global: {
      plugins: [vuetify],
    },
    props: { event, section: 'criteriaGroup', showTemporal: true },
  })
}

function makeCohort(event: CohortEvent): CohortDefinition {
  return {
    name: 'EndWindow round-trip test',
    entryEvents: [makeEvent({ id: 'entry-1' })],
    qualifyingLimit: 'ALL',
    inclusionRules: [
      {
        id: 'rule-1',
        name: 'EndWindow rule',
        criteriaGroups: [
          {
            id: 'group-1',
            logicType: 'ALL',
            events: [event],
          },
        ],
      },
    ],
    conceptSets: [],
  }
}

describe('EndWindow editor', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('does not render the end-window section unless showTemporal is enabled', () => {
    const wrapper = mount(CriteriaEventCard, {
      global: { plugins: [vuetify] },
      props: { event: makeEvent(), section: 'criteriaGroup', showTemporal: false },
    })
    expect(wrapper.text()).not.toContain('End window')
    expect(wrapper.find('[data-testid="add-end-window"]').exists()).toBe(false)
  })

  it('renders an affordance to add an end-date constraint when absent', () => {
    const wrapper = createWrapper(makeEvent())
    expect(wrapper.find('[data-testid="add-end-window"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="end-window-editor"]').exists()).toBe(false)
  })

  it('adds a default endTemporalWindow when the affordance is clicked', async () => {
    const wrapper = createWrapper(makeEvent())

    await wrapper.find('[data-testid="add-end-window"]').trigger('click')

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updated = updates![0]![0] as CohortEvent
    expect(updated.endTemporalWindow).toBeDefined()
  })

  it('renders and edits endTemporalWindow', async () => {
    const event = makeEvent({
      endTemporalWindow: {
        startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
        endWindow: { days: 30, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
      },
    })
    const wrapper = createWrapper(event)

    expect(wrapper.text()).toContain('End window')

    const editor = wrapper.findComponent(TemporalWindowEditor)
    expect(editor.exists()).toBe(true)

    const mutated = {
      startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
      endWindow: { days: 45, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
    }
    await editor.vm.$emit('update:modelValue', mutated)

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updated = updates![updates!.length - 1]![0] as CohortEvent
    expect(updated.endTemporalWindow).toEqual(mutated)
  })

  it('removes endTemporalWindow via the remove affordance', async () => {
    const event = makeEvent({
      endTemporalWindow: {
        startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
        endWindow: { days: 30, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
      },
    })
    const wrapper = createWrapper(event)

    await wrapper.find('[data-testid="remove-end-window"]').trigger('click')

    const updates = wrapper.emitted('update')
    expect(updates).toBeTruthy()
    const updated = updates![updates!.length - 1]![0] as CohortEvent
    expect(updated.endTemporalWindow).toBeUndefined()
  })

  it('round-trips EndWindow.UseEventEnd through convertInternalToAtlas', async () => {
    // UseEventEnd/UseIndexEnd are single flags on CIRCE's EndWindow (not
    // independently per Start/End bound — see atlas-converter.ts's read path,
    // which stamps the same flag onto both startWindow and endWindow). The
    // converter's write path takes the flags from startWindow when present,
    // so a realistic edit keeps both bounds' flags in agreement.
    const event = makeEvent({
      endTemporalWindow: {
        startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
        endWindow: { days: 30, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
      },
    })
    const wrapper = createWrapper(event)

    const editor = wrapper.findComponent(TemporalWindowEditor)
    const mutated = {
      startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
      endWindow: { days: 45, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: true },
    }
    await editor.vm.$emit('update:modelValue', mutated)

    const updated = wrapper.emitted('update')!.at(-1)![0] as CohortEvent
    const cohort = makeCohort(updated)
    const atlas = convertInternalToAtlas(cohort) as unknown as {
      InclusionRules: Array<{ expression: { CriteriaList: Array<{ EndWindow?: { End?: { Days?: number }; UseEventEnd?: boolean } }> } }>
    }

    const rtCriteria = atlas.InclusionRules[0]!.expression.CriteriaList[0]!
    expect(rtCriteria.EndWindow).toBeDefined()
    expect(rtCriteria.EndWindow!.UseEventEnd).toBe(true)
    expect(rtCriteria.EndWindow!.End?.Days).toBe(45)
  })
})
