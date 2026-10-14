import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IncidenceRateEmptyState from '@/components/incidence-rate/IncidenceRateEmptyState.vue'
import { tr } from '../../helpers/i18n-mock'
import { vuetify, pristinePinia } from './_test-helpers'

function mountWith(props: Record<string, unknown>) {
  return mount(IncidenceRateEmptyState, {
    global: { plugins: [pristinePinia(), vuetify] },
    props,
  })
}

describe('IncidenceRateEmptyState', () => {
  it('renders the no-id variant without a CTA', () => {
    const w = mountWith({ variant: 'no-id' })
    expect(w.find('[data-testid="ir-empty-no-id"]').exists()).toBe(true)
    expect(w.find('[data-testid="ir-empty-cta"]').exists()).toBe(false)
  })

  it('renders the no-runs variant with a Generate CTA emitting run', async () => {
    const w = mountWith({ variant: 'no-runs' })
    expect(w.find('[data-testid="ir-empty-no-runs"]').exists()).toBe(true)
    expect(w.text()).toContain(tr('ir.workbench.noRunsTitle'))
    const cta = w.find('[data-testid="ir-empty-cta"]')
    expect(cta.text()).toBe(tr('components.generation.generate'))
    await cta.trigger('click')
    expect(w.emitted('run')).toBeTruthy()
  })

  it('renders the failed variant with the error message', () => {
    const w = mountWith({ variant: 'run-failed', errorMessage: 'boom' })
    expect(w.find('[data-testid="ir-empty-run-failed"]').text()).toContain('boom')
  })

  it('renders the select-to variant', () => {
    const w = mountWith({ variant: 'select-to' })
    expect(w.find('[data-testid="ir-empty-select-to"]').exists()).toBe(true)
  })
})
