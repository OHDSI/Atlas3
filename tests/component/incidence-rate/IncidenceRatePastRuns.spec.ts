import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRatePastRuns from '@/components/incidence-rate/IncidenceRatePastRuns.vue'

const runs = [
  { id: 10, sourceKey: 'CCAE', sourceId: 10, status: 'COMPLETED', startTime: 2, duration: null, message: null },
  { id: 11, sourceKey: 'MDCD', sourceId: 11, status: 'STARTED',   startTime: 1, duration: null, message: null },
]

describe('IncidenceRatePastRuns', () => {
  it('renders one row per run with source key', () => {
    const w = mount(IncidenceRatePastRuns, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { runs, activeId: null },
    })
    const rows = w.findAll('[data-testid="ir-past-run-row"]')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('CCAE')
    expect(rows[1].text()).toContain('MDCD')
  })

  it('emits select(id) only for completed runs', async () => {
    const w = mount(IncidenceRatePastRuns, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { runs, activeId: null },
    })
    const rows = w.findAll('[data-testid="ir-past-run-row"]')
    await rows[0].trigger('click')
    await rows[1].trigger('click')
    expect(w.emitted('select')).toEqual([[10]])
  })

  it('marks the active row', () => {
    const w = mount(IncidenceRatePastRuns, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { runs, activeId: 10 },
    })
    const rows = w.findAll('[data-testid="ir-past-run-row"]')
    expect(rows[0].classes()).toContain('ir-past-run--active')
  })

  it('renders a "none yet" hint when the list is empty', () => {
    const w = mount(IncidenceRatePastRuns, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { runs: [], activeId: null },
    })
    expect(w.find('[data-testid="ir-past-runs-empty"]').exists()).toBe(true)
  })
})
