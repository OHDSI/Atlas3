import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, DOMWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import AtlasDialog from '@/components/ui/AtlasDialog.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

beforeEach(() => {
  setActivePinia(createPinia())
})

afterEach(() => {
  document.body.innerHTML = ''
})

async function mountOpen(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  const wrapper = mount(AtlasDialog, {
    global: { plugins: [vuetify] },
    attachTo: document.body,
    props: { modelValue: true, eyebrow: 'TEST', ...props },
    slots,
  })
  await new Promise(r => setTimeout(r, 50))
  return wrapper
}

function $body(selector: string) {
  return new DOMWrapper(document.body.querySelector(selector) as Element)
}

describe('AtlasDialog', () => {
  it('renders the eyebrow text', async () => {
    await mountOpen({ eyebrow: 'CONFIRM' })
    expect($body('.text-eyebrow').text()).toBe('CONFIRM')
  })

  it('renders the title when provided', async () => {
    await mountOpen({ title: 'Discard changes?' })
    expect($body('.atlas-dialog__title').text()).toBe('Discard changes?')
  })

  it('omits the title when not provided', async () => {
    await mountOpen({})
    expect(document.body.querySelector('.atlas-dialog__title')).toBeNull()
  })

  it('renders the subtitle when provided', async () => {
    await mountOpen({ title: 't', subtitle: 'extra' })
    expect($body('.atlas-dialog__subtitle').text()).toBe('extra')
  })

  it('renders the default slot content as the body', async () => {
    await mountOpen({}, { default: '<p class="bdy">hello</p>' })
    expect($body('.bdy').text()).toBe('hello')
  })

  it('renders the actions slot when provided', async () => {
    await mountOpen({}, { actions: '<button class="act">save</button>' })
    expect($body('.act').exists()).toBe(true)
  })

  it('omits the actions row when no actions slot', async () => {
    await mountOpen({})
    expect(document.body.querySelector('.atlas-dialog__actions')).toBeNull()
  })

  it('shows close button by default', async () => {
    await mountOpen({})
    expect(document.body.querySelector('button[aria-label="Close dialog"]')).not.toBeNull()
  })

  it('hides close button when show-close=false', async () => {
    await mountOpen({ showClose: false })
    expect(document.body.querySelector('button[aria-label="Close dialog"]')).toBeNull()
  })

  it('uses custom closeLabel as aria-label', async () => {
    await mountOpen({ closeLabel: 'Dismiss' })
    expect(document.body.querySelector('button[aria-label="Dismiss"]')).not.toBeNull()
  })

  it('emits close + update:modelValue(false) when close button clicked', async () => {
    const wrapper = await mountOpen({})
    const closeBtn = document.body.querySelector('button[aria-label="Close dialog"]') as HTMLButtonElement
    closeBtn.click()
    await new Promise(r => setTimeout(r, 0))
    expect(wrapper.emitted('close')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })

  it('sets role="dialog" and aria-modal on the dialog overlay', async () => {
    await mountOpen({ title: 'Confirm' })
    const dialog = document.body.querySelector('[role="dialog"][aria-modal="true"]')
    expect(dialog).not.toBeNull()
  })

  it('links aria-labelledby to the title heading id', async () => {
    await mountOpen({ title: 'Confirm action' })
    const dialog = document.body.querySelector('[role="dialog"]') as HTMLElement
    const labelledBy = dialog.getAttribute('aria-labelledby')
    expect(labelledBy).toBeTruthy()
    const heading = document.body.querySelector(`#${labelledBy}`)
    expect(heading?.textContent).toBe('Confirm action')
  })

  it('restores focus to the previously focused element when closed', async () => {
    const trigger = document.createElement('button')
    trigger.textContent = 'open'
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = mount(AtlasDialog, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
      props: { modelValue: true, eyebrow: 'TEST', title: 'X' },
    })
    await new Promise(r => setTimeout(r, 50))

    await wrapper.setProps({ modelValue: false })
    await new Promise(r => setTimeout(r, 50))

    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
  })
})
