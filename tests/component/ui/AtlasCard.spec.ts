// tests/component/ui/AtlasCard.spec.ts
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasCard from '@/components/ui/AtlasCard.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(props: Record<string, unknown> = {}, slots: Record<string, string> = { default: 'body' }) {
  return mount(AtlasCard, { global: { plugins: [vuetify] }, props, slots })
}

describe('AtlasCard', () => {
  it('renders as a div by default', () => {
    const wrapper = mountWith()
    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.classes()).toContain('atlas-card')
  })

  it('renders the slot content', () => {
    const wrapper = mountWith({}, { default: 'hello' })
    expect(wrapper.text()).toBe('hello')
  })

  it('applies the medium padding class by default', () => {
    const wrapper = mountWith()
    expect(wrapper.classes()).toContain('atlas-card--padding-md')
  })

  it('applies the requested padding class', () => {
    const wrapper = mountWith({ padding: 'lg' })
    expect(wrapper.classes()).toContain('atlas-card--padding-lg')
  })

  it('adds the interactive modifier when interactive=true', () => {
    const wrapper = mountWith({ interactive: true })
    expect(wrapper.classes()).toContain('atlas-card--interactive')
  })

  it('renders as a custom tag when tag prop is set', () => {
    const wrapper = mountWith({ tag: 'a' })
    expect(wrapper.element.tagName).toBe('A')
  })
})
