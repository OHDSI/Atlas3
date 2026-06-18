import { describe, it, expect, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { vuetify, pristinePinia } from './_test-helpers'
import AtlasSnackbar from '@/components/ui/AtlasSnackbar.vue'

afterEach(() => {
  document.body.innerHTML = ''
})

function mountWith(props: Record<string, unknown>, slots: Record<string, string> = {}) {
  return mount(AtlasSnackbar, {
    global: { plugins: [pristinePinia(), vuetify] },
    props,
    slots,
    attachTo: document.body,
  })
}

describe('AtlasSnackbar', () => {
  it('renders the C feedback body with severity when open', () => {
    mountWith({ modelValue: true, severity: 'success', title: 'Saved', text: 'Cohort saved' })
    const el = document.body.querySelector('[data-testid="atlas-feedback"]')
    expect(el).not.toBeNull()
    expect(el?.className).toContain('atlas-feedback--success')
    expect(document.body.textContent).toContain('Cohort saved')
  })

  it('emits update:modelValue=false when closed', async () => {
    const w = mountWith({ modelValue: true, severity: 'info', text: 'Hi', closable: true })
    const btn = document.body.querySelector('[data-testid="atlas-feedback-close"]') as HTMLElement
    btn.click()
    await w.vm.$nextTick()
    expect(w.emitted('update:modelValue')?.at(-1)).toEqual([false])
  })

  it('sets role=alert and aria-live=assertive for danger severity', async () => {
    mountWith({ modelValue: true, severity: 'danger', text: 'Error' })
    await nextTick()
    const el = document.body.querySelector('[role="alert"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('aria-live')).toBe('assertive')
  })

  it('sets role=status and aria-live=polite for info severity', async () => {
    mountWith({ modelValue: true, severity: 'info', text: 'Info' })
    await nextTick()
    const el = document.body.querySelector('[role="status"]')
    expect(el).not.toBeNull()
    expect(el?.getAttribute('aria-live')).toBe('polite')
  })
})
