import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateInsightsRail from '@/components/incidence-rate/IncidenceRateInsightsRail.vue'

const report = {
  summary: { targetId: 1, outcomeId: 2, totalPersons: 1000, cases: 50, timeAtRisk: 365_250, proportion: 0.05, rate: 0.0005 },
  stratifyStats: [
    { id: 1, name: 'Female', totalPersons: 500, cases: 20, timeAtRisk: 182_625 },
  ],
  treemapData: '',
}

describe('IncidenceRateInsightsRail', () => {
  it('renders four KPI cards with multiplier applied', () => {
    const w = mount(IncidenceRateInsightsRail, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { report, multiplier: 1000 },
    })
    const kpis = w.findAll('[data-testid="ir-kpi"]')
    expect(kpis.length).toBe(4)
    // Rate = 0.0005 * 1000 = 0.50
    expect(kpis[3].text()).toContain('0.50')
  })

  it('renders the stratification table only when stratifyStats is non-empty', () => {
    const w = mount(IncidenceRateInsightsRail, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { report, multiplier: 1000 },
    })
    expect(w.find('[data-testid="ir-insights-strata"]').exists()).toBe(true)

    const w2 = mount(IncidenceRateInsightsRail, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { report: { ...report, stratifyStats: [] }, multiplier: 1000 },
    })
    expect(w2.find('[data-testid="ir-insights-strata"]').exists()).toBe(false)
  })
})
