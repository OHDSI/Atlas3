// tests/component/ui/AtlasActionToolbar.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasActionToolbar from '@/components/ui/AtlasActionToolbar.vue'

const vuetify = createVuetify({ components, directives })

function mountWith(slots: Record<string, string> = {}) {
  return mount(AtlasActionToolbar, { global: { plugins: [vuetify] }, slots })
}

describe('AtlasActionToolbar', () => {
  it('always renders the toolbar root', () => {
    const wrapper = mountWith()
    expect(wrapper.find('.builder-action-toolbar').exists()).toBe(true)
  })

  it('renders only the status region when given a status slot', () => {
    const wrapper = mountWith({ status: '<span data-testid="s">status</span>' })
    expect(wrapper.find('.builder-action-toolbar__status').exists()).toBe(true)
    expect(wrapper.find('[data-testid="s"]').exists()).toBe(true)
    expect(wrapper.find('.builder-action-toolbar__actions').exists()).toBe(false)
    expect(wrapper.find('.builder-action-toolbar__divider').exists()).toBe(false)
  })

  it('renders only the actions region when given an actions slot', () => {
    const wrapper = mountWith({ actions: '<button data-testid="a">save</button>' })
    expect(wrapper.find('.builder-action-toolbar__actions').exists()).toBe(true)
    expect(wrapper.find('[data-testid="a"]').exists()).toBe(true)
    expect(wrapper.find('.builder-action-toolbar__status').exists()).toBe(false)
    expect(wrapper.find('.builder-action-toolbar__divider').exists()).toBe(false)
  })

  it('renders the divider only when both slots are present', () => {
    const wrapper = mountWith({
      status: '<span>status</span>',
      actions: '<button>save</button>',
    })
    expect(wrapper.find('.builder-action-toolbar__status').exists()).toBe(true)
    expect(wrapper.find('.builder-action-toolbar__actions').exists()).toBe(true)
    expect(wrapper.find('.builder-action-toolbar__divider').exists()).toBe(true)
  })
})
