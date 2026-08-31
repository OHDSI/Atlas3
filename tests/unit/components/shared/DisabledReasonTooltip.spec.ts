/**
 * Issue #300. The wrapper span is the point of this component: a disabled
 * button swallows pointer events, so a tooltip bound straight to it never
 * opens. Wrapping the button is what makes the explanation reachable.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import DisabledReasonTooltip from '@/components/shared/DisabledReasonTooltip.vue'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn(),
}))

function mountWith(reason: string) {
  return mount(DisabledReasonTooltip, {
    global: { plugins: [vuetify] },
    props: { reason },
    slots: { default: '<button data-testid="inner" disabled>Save</button>' },
  })
}

describe('DisabledReasonTooltip', () => {
  it('renders the slot content whether or not there is a reason', () => {
    expect(mountWith('').find('[data-testid="inner"]').exists()).toBe(true)
    expect(mountWith('No access').find('[data-testid="inner"]').exists()).toBe(true)
  })

  it('wraps the slot so a disabled control can still surface the tooltip', () => {
    const wrapper = mountWith('No access')
    const wrap = wrapper.find('[data-testid="disabled-reason-wrap"]')

    expect(wrap.exists()).toBe(true)
    expect(wrap.find('[data-testid="inner"]').exists()).toBe(true)
  })

  it('adds no wrapper when there is nothing to explain', () => {
    const wrapper = mountWith('')
    expect(wrapper.find('[data-testid="disabled-reason-wrap"]').exists()).toBe(false)
  })

  it('carries the reason as the accessible title too, not only the hover tooltip', () => {
    // A Vuetify tooltip renders into an overlay on hover, so the reason would
    // otherwise be unreachable to anyone not using a mouse.
    const wrap = mountWith('You do not own this cohort').find('[data-testid="disabled-reason-wrap"]')
    expect(wrap.attributes('title')).toBe('You do not own this cohort')
  })
})
