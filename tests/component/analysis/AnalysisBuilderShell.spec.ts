/**
 * AnalysisBuilderShell interaction tests
 *
 * Exercises the `back` and `clear-error` emit handlers so v8 reports the
 * inline arrow callbacks as executed. Without these clicks, the script-block
 * functions sit at 0% coverage even though the template renders.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

const stubs = {
  AtlasPageShell: {
    name: 'AtlasPageShell',
    props: ['hero', 'compact', 'eyebrow', 'title', 'subtitle'],
    template:
      '<div class="stub-shell">' +
      '<slot name="title" />' +
      '<slot name="subtitle" />' +
      '<div class="stub-actions"><slot name="actions" /></div>' +
      '<slot />' +
      '</div>',
  },
  AtlasButton: {
    name: 'AtlasButton',
    props: ['variant', 'size', 'icon'],
    emits: ['click'],
    template:
      '<button class="stub-button" v-bind="$attrs" @click="$emit(\'click\', $event)"><slot /></button>',
  },
  AtlasAlert: {
    name: 'AtlasAlert',
    props: ['severity', 'closable', 'density'],
    emits: ['close'],
    template:
      '<div class="stub-alert" v-bind="$attrs"><slot /><button class="stub-alert-close" @click="$emit(\'close\')" /></div>',
  },
}

function mountIt(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(AnalysisBuilderShell, {
    props,
    slots,
    global: { plugins: [vuetify], stubs },
  })
}

describe('AnalysisBuilderShell interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('emits back when the back button is clicked', async () => {
    const wrapper = mountIt({ testid: 'shell', title: 'X' })
    const backBtn = wrapper.find('[data-testid="shell-back"]')
    expect(backBtn.exists()).toBe(true)
    await backBtn.trigger('click')
    expect(wrapper.emitted('back')).toBeTruthy()
  })

  it('emits clear-error when the alert is dismissed', async () => {
    const wrapper = mountIt({ error: 'Boom', testid: 'shell' })
    await wrapper.find('.stub-alert-close').trigger('click')
    expect(wrapper.emitted('clear-error')).toBeTruthy()
  })

  it('does not render the back button when showBack is false', () => {
    const wrapper = mountIt({ showBack: false, testid: 'shell' })
    expect(wrapper.find('[data-testid="shell-back"]').exists()).toBe(false)
  })

  it('renders title/subtitle slots when provided', () => {
    const wrapper = mountIt(
      { title: 'Plain' },
      { title: '<span class="slot-title">Slot Title</span>', subtitle: '<span class="slot-sub">Slot Sub</span>' }
    )
    expect(wrapper.find('.slot-title').exists()).toBe(true)
    expect(wrapper.find('.slot-sub').exists()).toBe(true)
  })

  it('renders the banner slot when provided', () => {
    const wrapper = mountIt({ title: 'X' }, { banner: '<div class="slot-banner">Hi</div>' })
    expect(wrapper.find('.slot-banner').exists()).toBe(true)
    expect(wrapper.find('.builder-shell__banner').exists()).toBe(true)
  })

  it('renders the error alert only when error is provided', async () => {
    const wrapper = mountIt({ title: 'X' })
    expect(wrapper.find('.stub-alert').exists()).toBe(false)
    await wrapper.setProps({ error: 'Boom' })
    expect(wrapper.find('.stub-alert').exists()).toBe(true)
  })

  it('uses a custom backLabel when provided', () => {
    const wrapper = mountIt({ backLabel: 'Return', testid: 'shell' })
    expect(wrapper.find('[data-testid="shell-back"]').text()).toContain('Return')
  })
})
