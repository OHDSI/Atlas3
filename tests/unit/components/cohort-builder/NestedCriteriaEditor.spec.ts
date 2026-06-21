import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { createPinia, setActivePinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import NestedCriteriaEditor from '@/components/cohort-builder/NestedCriteriaEditor.vue'
import type { NestedCriteria, CohortEvent } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }))

const vuetify = createVuetify({ components, directives })

function mountComponent(modelValue: NestedCriteria = { id: 'nested-1', logicType: 'ALL', events: [] }) {
  const pinia = createPinia()
  setActivePinia(pinia)
  return mount(NestedCriteriaEditor, {
    props: { modelValue },
    global: {
      plugins: [vuetify, pinia],
      stubs: {
        CriteriaEventCard: {
          template: '<div class="criteria-event-card-stub" />',
          props: ['event', 'section', 'showCardinality', 'showTemporal', 'showCriteriaOptions', 'depth'],
          emits: ['update', 'remove', 'select-concept-set'],
        },
      },
    },
  })
}

describe('NestedCriteriaEditor', () => {
  it('defaults ignoreObservationPeriod to true for a newly added criteria', async () => {
    const wrapper = mountComponent()
    await (wrapper.vm as unknown as { addCriteria: (t: string) => void }).addCriteria('ConditionOccurrence')

    const emitted = wrapper.emitted('update:modelValue') as unknown[][]
    const updated = emitted[emitted.length - 1][0] as NestedCriteria
    const added = updated.events[updated.events.length - 1] as CohortEvent
    expect(added.ignoreObservationPeriod).toBe(true)
  })
})
