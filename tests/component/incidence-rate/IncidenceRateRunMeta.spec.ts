import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateRunMeta from '@/components/incidence-rate/IncidenceRateRunMeta.vue'

const baseRun = {
  id: 10, sourceKey: 'CCAE', sourceId: 10,
  status: 'COMPLETED' as const,
  startTime: new Date('2026-05-02T10:00:00Z').valueOf(),
  duration: 184_000,
  message: null,
}

describe('IncidenceRateRunMeta', () => {
  it('renders status and duration in mm:ss', () => {
    const w = mount(IncidenceRateRunMeta, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { run: baseRun },
    })
    const t = w.find('[data-testid="ir-run-meta"]').text()
    expect(t).toContain('COMPLETED')
    expect(t).toContain('3:04')
  })

  it('shows the error message when status is FAILED', () => {
    const w = mount(IncidenceRateRunMeta, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { run: { ...baseRun, status: 'FAILED', message: 'div/0' } },
    })
    expect(w.find('[data-testid="ir-run-meta-error"]').text()).toContain('div/0')
  })
})
