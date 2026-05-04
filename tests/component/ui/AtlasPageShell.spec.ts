// tests/component/ui/AtlasPageShell.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasPageShell from '@/components/ui/AtlasPageShell.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AtlasPageShell, { global: { plugins: [vuetify] }, props, slots })
}

describe('AtlasPageShell', () => {
  it('renders the title prop as an h1', () => {
    const wrapper = mountWith({ title: 'My page' })
    expect(wrapper.find('h1').text()).toBe('My page')
  })

  it('renders the subtitle prop when provided', () => {
    const wrapper = mountWith({ title: 't', subtitle: 's' })
    expect(wrapper.find('.page-header__subtitle').text()).toBe('s')
  })

  it('renders the title slot in place of the title prop when both are present', () => {
    const wrapper = mountWith({ title: 'prop' }, { title: '<span class="t-slot">slot</span>' })
    expect(wrapper.find('.t-slot').exists()).toBe(true)
    expect(wrapper.find('h1').exists()).toBe(false)
  })

  it('renders the actions slot when provided', () => {
    const wrapper = mountWith({ title: 't' }, { actions: '<button class="action-btn">go</button>' })
    expect(wrapper.find('.action-btn').exists()).toBe(true)
  })

  it('omits the header section when no title / subtitle / slots are provided', () => {
    const wrapper = mountWith({})
    expect(wrapper.find('.page-header').exists()).toBe(false)
  })

  it('applies the hero modifier class when hero=true', () => {
    const wrapper = mountWith({ title: 't', hero: true })
    expect(wrapper.find('.page-header--hero').exists()).toBe(true)
  })

  it('applies the hero-compact modifier when hero=true and compact=true', () => {
    const wrapper = mountWith({ title: 't', hero: true, compact: true })
    expect(wrapper.find('.page-header--hero-compact').exists()).toBe(true)
  })

  it('renders the eyebrow text only in hero mode', () => {
    const heroWrapper = mountWith({ title: 't', hero: true, eyebrow: 'OHDSI' })
    expect(heroWrapper.find('.text-eyebrow').text()).toBe('OHDSI')
    const flatWrapper = mountWith({ title: 't', eyebrow: 'OHDSI' })
    expect(flatWrapper.find('.text-eyebrow').exists()).toBe(false)
  })
})
