import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import AtlasAlert from '@/components/ui/AtlasAlert.vue'

function mountWith(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(AtlasAlert, { global: { plugins: [pristinePinia(), vuetify] }, props, slots })
}

describe('AtlasAlert', () => {
  it('renders severity, title and body', () => {
    const w = mountWith({ severity: 'warning', title: 'Heads up' }, { default: 'Check config' })
    expect(w.find('[data-testid="atlas-feedback"]').classes()).toContain('atlas-feedback--warning')
    expect(w.text()).toContain('Heads up')
    expect(w.text()).toContain('Check config')
  })

  it('renders a count and a details slot', () => {
    const w = mountWith({ severity: 'warning', title: 'Warnings', count: 2 }, { details: 'detail-text' })
    expect(w.find('[data-testid="atlas-feedback-count"]').text()).toBe('2')
    expect(w.text()).toContain('detail-text')
  })

  it('emits close from the close button', async () => {
    const w = mountWith({ severity: 'info', title: 'Hi', closable: true })
    await w.find('[data-testid="atlas-feedback-close"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })
})
