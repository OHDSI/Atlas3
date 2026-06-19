import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import AtlasFeedbackBody from '@/components/ui/AtlasFeedbackBody.vue'

function mountWith(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(AtlasFeedbackBody, {
    global: { plugins: [pristinePinia(), vuetify] },
    props,
    slots,
  })
}

describe('AtlasFeedbackBody', () => {
  it('applies the severity modifier class', () => {
    const w = mountWith({ severity: 'danger', title: 'Boom' })
    expect(w.find('[data-testid="atlas-feedback"]').classes()).toContain('atlas-feedback--danger')
  })

  it('renders the title and message slot', () => {
    const w = mountWith({ severity: 'success', title: 'Saved' }, { default: 'All good' })
    expect(w.text()).toContain('Saved')
    expect(w.text()).toContain('All good')
  })

  it('renders a count chip when count is provided', () => {
    const w = mountWith({ severity: 'warning', title: 'Warnings', count: 3 })
    expect(w.find('[data-testid="atlas-feedback-count"]').text()).toBe('3')
  })

  it('emits close when the close button is clicked', async () => {
    const w = mountWith({ severity: 'info', title: 'Hi', closable: true })
    await w.find('[data-testid="atlas-feedback-close"]').trigger('click')
    expect(w.emitted('close')).toBeTruthy()
  })

  it('uses the neutral (navy) modifier for tone="neutral"', () => {
    const w = mountWith({ tone: 'neutral', title: 'Note' })
    expect(w.find('[data-testid="atlas-feedback"]').classes()).toContain('atlas-feedback--neutral')
  })
})
