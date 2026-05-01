import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown>) {
  return mount(AppDialogHeader, {
    global: { plugins: [vuetify] },
    props,
  })
}

describe('AppDialogHeader', () => {
  it('renders the eyebrow text', () => {
    const wrapper = mountWith({ eyebrow: 'Confirm' })
    expect(wrapper.find('.text-eyebrow').text()).toBe('Confirm')
  })

  it('renders the title when provided', () => {
    const wrapper = mountWith({ eyebrow: 'Confirm', title: 'Discard changes?' })
    expect(wrapper.find('.app-dialog-header__title').text()).toBe('Discard changes?')
  })

  it('omits the title when not provided', () => {
    const wrapper = mountWith({ eyebrow: 'Info' })
    expect(wrapper.find('.app-dialog-header__title').exists()).toBe(false)
  })

  it('renders the subtitle when provided', () => {
    const wrapper = mountWith({ eyebrow: 'Info', title: 'X', subtitle: 'extra detail' })
    expect(wrapper.find('.app-dialog-header__subtitle').text()).toBe('extra detail')
  })

  it('emits close when the close button is clicked', async () => {
    const wrapper = mountWith({ eyebrow: 'Info', title: 'X', showClose: true })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('hides the close button by default', () => {
    const wrapper = mountWith({ eyebrow: 'Info', title: 'X' })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
