import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateRatesTable from '@/components/incidence-rate/IncidenceRateRatesTable.vue'

const report = {
  summary: { targetId: 1, outcomeId: 2, totalPersons: 100, cases: 5, timeAtRisk: 36500, proportion: 0.05, rate: 0.0005 },
  stratifyStats: [
    { id: 1, name: 'Age 18–49', totalPersons: 60, cases: 2, timeAtRisk: 21900 },
    { id: 2, name: 'Age 50+',   totalPersons: 40, cases: 3, timeAtRisk: 14600 },
  ],
  treemapData: '',
}

describe('IncidenceRateRatesTable', () => {
  it('renders one summary row + one row per stratum, multiplier applied', () => {
    const w = mount(IncidenceRateRatesTable, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { report, multiplier: 1000 },
    })
    const rows = w.findAll('[data-testid="ir-rate-row"]')
    expect(rows.length).toBe(3) // summary + 2 strata
    // summary rate per 1000 person-years = 0.0005 * 1000 = 0.50
    expect(rows[0].text()).toContain('0.50')
  })
})
