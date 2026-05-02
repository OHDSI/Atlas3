import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateDesignRail from '@/components/incidence-rate/IncidenceRateDesignRail.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'

const stubs = [
  'IncidenceRateCohortList',
  'IncidenceRateCohortPicker',
  'IncidenceRateTimeAtRiskEditor',
  'IncidenceRateStudyWindowEditor',
  'IncidenceRateStratifyRulesList',
  'IncidenceRatePastRuns',
]

describe('IncidenceRateDesignRail', () => {
  it('renders all six panels when an IR is loaded', () => {
    pristinePinia()
    const store = useIncidenceRateStore()
    store.createNewIR()
    if (store.currentIR) store.currentIR.id = 1
    const w = mount(IncidenceRateDesignRail, {
      global: { plugins: [vuetify], stubs },
      props: { activeRunId: null },
    })
    expect(w.findAll('[data-testid^="ir-rail-panel-"]').length).toBe(6)
  })

  it('hides past-runs panel when the IR is unsaved', () => {
    pristinePinia()
    const store = useIncidenceRateStore()
    store.createNewIR()
    const w = mount(IncidenceRateDesignRail, {
      global: { plugins: [vuetify], stubs },
      props: { activeRunId: null },
    })
    expect(w.find('[data-testid="ir-rail-panel-past-runs"]').exists()).toBe(false)
  })
})
