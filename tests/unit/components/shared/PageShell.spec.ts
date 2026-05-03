/**
 * PageShell Component Tests
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { AtlasPageShell } from '@/components/ui'

const vuetify = createVuetify({ components, directives })

function mountShell(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AtlasPageShell, {
    props,
    slots: {
      default: '<div class="body-marker">body content</div>',
      ...slots,
    },
    global: { plugins: [vuetify] },
  })
}

describe('PageShell', () => {
  it('renders a wrapper, card, and the default slot body', () => {
    const wrapper = mountShell({ title: 'Cohorts' })
    expect(wrapper.find('.page-wrapper').exists()).toBe(true)
    expect(wrapper.find('.page-card').exists()).toBe(true)
    expect(wrapper.find('.body-marker').text()).toBe('body content')
  })

  it('renders the title in the page header', () => {
    const wrapper = mountShell({ title: 'Cohorts' })
    const title = wrapper.find('.page-header__title')
    expect(title.exists()).toBe(true)
    expect(title.text()).toBe('Cohorts')
  })

  it('renders the subtitle when provided', () => {
    const wrapper = mountShell({ title: 'Cohorts', subtitle: '42 definitions' })
    const subtitle = wrapper.find('.page-header__subtitle')
    expect(subtitle.exists()).toBe(true)
    expect(subtitle.text()).toBe('42 definitions')
  })

  it('omits the subtitle element when no subtitle is provided', () => {
    const wrapper = mountShell({ title: 'Cohorts' })
    expect(wrapper.find('.page-header__subtitle').exists()).toBe(false)
  })

  it('renders the actions slot in the header', () => {
    const wrapper = mountShell(
      { title: 'Cohorts' },
      { actions: '<button class="actions-marker">New</button>' }
    )
    const actionsArea = wrapper.find('.page-header__actions')
    expect(actionsArea.exists()).toBe(true)
    expect(actionsArea.find('.actions-marker').exists()).toBe(true)
  })

  it('omits the page header entirely when no title and no actions slot are provided', () => {
    const wrapper = mountShell({})
    expect(wrapper.find('.page-header').exists()).toBe(false)
  })

  it('applies the page-card padding class to the body container', () => {
    const wrapper = mountShell({ title: 'Cohorts' })
    expect(wrapper.find('.page-card__body').exists()).toBe(true)
  })
})
