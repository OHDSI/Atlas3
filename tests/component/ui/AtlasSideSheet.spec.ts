import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { VMenu } from 'vuetify/components'
import AtlasSideSheet from '@/components/ui/AtlasSideSheet.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

const settle = () => new Promise(r => setTimeout(r, 50))

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  document.body.innerHTML = ''
})

function zIndexOf(el: Element | null): number {
  return Number((el as HTMLElement | null)?.style.zIndex ?? NaN)
}

describe('AtlasSideSheet', () => {
  it('renders slot content in an overlay panel with sheet classes and aria-label', async () => {
    mount(AtlasSideSheet, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
      props: { modelValue: true, ariaLabel: 'Edit thing', contentClass: 'extra' },
      slots: { default: '<div data-testid="sheet-body">hello</div>' },
    })
    await settle()

    const overlay = document.body.querySelector('.v-dialog.atlas-side-sheet')
    expect(overlay).not.toBeNull()
    const panel = overlay!.querySelector('.v-overlay__content.atlas-side-sheet__panel.extra')
    expect(panel).not.toBeNull()
    expect(panel!.querySelector('[data-testid="sheet-body"]')?.textContent).toBe('hello')
    expect(document.body.querySelector('[aria-label="Edit thing"]')).not.toBeNull()
  })

  it('renders nothing while closed', async () => {
    mount(AtlasSideSheet, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
      props: { modelValue: false },
      slots: { default: '<div data-testid="sheet-body">hello</div>' },
    })
    await settle()
    expect(document.body.querySelector('[data-testid="sheet-body"]')).toBeNull()
  })

  it('does not block browser back navigation', () => {
    const wrapper = mount(AtlasSideSheet, {
      global: { plugins: [vuetify] },
      props: { modelValue: false },
    })
    expect(wrapper.findComponent({ name: 'VDialog' }).props('closeOnBack')).toBe(false)
  })

  it('requests close on Escape and lets the parent decide', async () => {
    const wrapper = mount(AtlasSideSheet, {
      global: { plugins: [vuetify] },
      attachTo: document.body,
      props: { modelValue: true },
      slots: { default: '<button data-testid="inside">x</button>' },
    })
    await settle()

    document.body.querySelector<HTMLElement>('[data-testid="inside"]')!.focus()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([false])
    // Controlled: still open until the parent updates modelValue.
    expect(document.body.querySelector('[data-testid="inside"]')).not.toBeNull()
  })

  it('stacks overlays opened inside it above the sheet without z-index overrides', async () => {
    const Host = defineComponent({
      setup() {
        return () =>
          h(AtlasSideSheet, { modelValue: true }, () =>
            h(VMenu, { modelValue: true, activator: 'parent' }, () =>
              h('div', { 'data-testid': 'menu-body' }, 'menu')
            )
          )
      },
    })
    mount(Host, { global: { plugins: [vuetify] }, attachTo: document.body })
    await settle()

    const sheet = document.body.querySelector('.v-dialog.atlas-side-sheet')
    const menu = document.body.querySelector('[data-testid="menu-body"]')?.closest('.v-overlay')
    expect(menu).toBeTruthy()
    expect(zIndexOf(menu!)).toBeGreaterThan(zIndexOf(sheet))
  })

  it('stacks a nested side sheet above its parent sheet', async () => {
    const Host = defineComponent({
      setup() {
        return () =>
          h(AtlasSideSheet, { modelValue: true, contentClass: 'outer' }, () =>
            h(AtlasSideSheet, { modelValue: true, contentClass: 'inner' }, () => h('div', 'inner'))
          )
      },
    })
    mount(Host, { global: { plugins: [vuetify] }, attachTo: document.body })
    await settle()

    const outer = document.body.querySelector('.atlas-side-sheet__panel.outer')?.closest('.v-overlay')
    const inner = document.body.querySelector('.atlas-side-sheet__panel.inner')?.closest('.v-overlay')
    expect(zIndexOf(inner!)).toBeGreaterThan(zIndexOf(outer!))
  })

  it('restores focus to the previously focused element when closed', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()

    const open = ref(false)
    const Host = defineComponent({
      setup() {
        return () => h(AtlasSideSheet, { modelValue: open.value }, () => h('button', 'inside'))
      },
    })
    mount(Host, { global: { plugins: [vuetify] }, attachTo: document.body })

    open.value = true
    await settle()
    open.value = false
    await settle()

    expect(document.activeElement).toBe(trigger)
  })
})
