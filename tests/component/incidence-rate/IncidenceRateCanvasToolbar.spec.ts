import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import IncidenceRateCanvasToolbar from '@/components/incidence-rate/IncidenceRateCanvasToolbar.vue'

const baseProps = {
  mode: 'treemap' as const,
  activeRun: { id: 10, sourceKey: 'CCAE', sourceId: 10, status: 'COMPLETED', startTime: 1, duration: 100, message: null },
  selectedTargetId: 1,
  selectedOutcomeId: 2,
  multiplier: 1000,
  availableTargets: [{ id: 1, name: 'Metformin' }],
  availableOutcomes: [{ id: 2, name: 'Diabetes' }],
  hasResults: true,
}

describe('IncidenceRateCanvasToolbar', () => {
  it('renders the active-run chip with id and sourceKey', () => {
    const w = mount(IncidenceRateCanvasToolbar, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: baseProps,
    })
    const t = w.find('[data-testid="ir-toolbar-run-chip"]').text()
    expect(t).toContain('#10')
    expect(t).toContain('CCAE')
  })

  it('emits update:mode on view toggle', async () => {
    const w = mount(IncidenceRateCanvasToolbar, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: baseProps,
    })
    await w.find('[data-testid="ir-toolbar-mode-table"]').trigger('click')
    expect(w.emitted('update:mode')).toEqual([['table']])
  })

  it('disables export when hasResults is false', () => {
    const w = mount(IncidenceRateCanvasToolbar, {
      global: { plugins: [pristinePinia(), vuetify] },
      props: { ...baseProps, hasResults: false },
    })
    const btn = w.find('[data-testid="ir-toolbar-export"]').element as HTMLButtonElement
    expect(btn.disabled || btn.getAttribute('disabled') !== null).toBe(true)
  })
})
