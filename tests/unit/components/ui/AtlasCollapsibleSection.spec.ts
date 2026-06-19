import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasCollapsibleSection from '@/components/ui/AtlasCollapsibleSection.vue'

const vuetify = createVuetify({ components, directives })

function mountSection(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AtlasCollapsibleSection, {
    global: { plugins: [vuetify] },
    props: { title: 'Generation', ...props },
    slots: { default: '<div data-testid="body">body</div>', ...slots },
  })
}

describe('AtlasCollapsibleSection', () => {
  it('renders the title and body and defaults to expanded', () => {
    const wrapper = mountSection()
    expect(wrapper.text()).toContain('Generation')
    const body = wrapper.find('[data-testid="body"]')
    expect(body.exists()).toBe(true)
    expect((body.element as HTMLElement).style.display).not.toBe('none')
    expect(wrapper.find('[data-testid="cs-header"]').attributes('aria-expanded')).toBe('true')
  })

  it('respects defaultExpanded=false', () => {
    const wrapper = mountSection({ defaultExpanded: false })
    const body = wrapper.find('[data-testid="body"]')
    expect(body.exists()).toBe(true)
    const cssBody = wrapper.find('.cs__body')
    expect((cssBody.element as HTMLElement).style.display).toBe('none')
    expect(wrapper.find('[data-testid="cs-header"]').attributes('aria-expanded')).toBe('false')
  })

  it('toggles on header click', async () => {
    const wrapper = mountSection()
    const header = wrapper.find('[data-testid="cs-header"]')
    await header.trigger('click')
    await nextTick()
    expect(header.attributes('aria-expanded')).toBe('false')
    expect((wrapper.find('.cs__body').element as HTMLElement).style.display).toBe('none')
    await header.trigger('click')
    await nextTick()
    expect(header.attributes('aria-expanded')).toBe('true')
  })

  it('keeps body mounted while collapsed (state survives)', async () => {
    const wrapper = mountSection({ defaultExpanded: false }, {
      default: '<input data-testid="probe" />',
    })
    expect(wrapper.find('[data-testid="probe"]').exists()).toBe(true)
  })

  it('renders badge, stateChip and meta when provided', () => {
    const wrapper = mountSection({
      badge: '1',
      stateChip: { label: 'Ready', tone: 'success' },
      meta: 'Last run · 2h ago',
    })
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('Ready')
    expect(wrapper.text()).toContain('Last run · 2h ago')
  })

  it('does not toggle when interacting with the controls slot', async () => {
    const wrapper = mountSection({}, {
      controls: '<button data-testid="ctrl">ctrl</button>',
    })
    await wrapper.find('[data-testid="ctrl"]').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-testid="cs-header"]').attributes('aria-expanded')).toBe('true')
  })

  it('toggles on Enter and Space keypresses', async () => {
    const wrapper = mountSection()
    const header = wrapper.find('[data-testid="cs-header"]')
    await header.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(header.attributes('aria-expanded')).toBe('false')
    await header.trigger('keydown', { key: ' ' })
    await nextTick()
    expect(header.attributes('aria-expanded')).toBe('true')
  })
})
