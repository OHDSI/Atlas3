import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import IncidenceRateTimeAtRiskEditor from '@/components/incidence-rate/IncidenceRateTimeAtRiskEditor.vue'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { createTestVuetify } from '../../helpers/vuetify-setup'

beforeEach(() => setActivePinia(createPinia()))

describe('IncidenceRateTimeAtRiskEditor', () => {
  it('shows error when same DateField + end Offset <= start Offset', async () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    store.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 5 },
      end:   { DateField: 'StartDate', Offset: 0 },
    })
    const wrapper = mount(IncidenceRateTimeAtRiskEditor, {
      global: { plugins: [createTestVuetify()] },
    })
    expect(wrapper.text()).toMatch(/end must be after start/i)
  })

  it('does not show error for valid TAR', () => {
    const store = useIncidenceRateStore()
    store.createNewIR()
    store.updateTimeAtRisk({
      start: { DateField: 'StartDate', Offset: 0 },
      end:   { DateField: 'EndDate', Offset: 365 },
    })
    const wrapper = mount(IncidenceRateTimeAtRiskEditor, {
      global: { plugins: [createTestVuetify()] },
    })
    expect(wrapper.text()).not.toMatch(/end must be after start/i)
  })
})
