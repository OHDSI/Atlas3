import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

import ComparisonVennDiagram from '@/components/concepts/ComparisonVennDiagram.vue'

const vuetify = createVuetify({
  components,
  directives,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

interface MountOptions {
  leftOnly?: number
  rightOnly?: number
  both?: number
  leftLabel?: string
  rightLabel?: string
}

function createWrapper(opts: MountOptions = {}) {
  return mount(ComparisonVennDiagram, {
    props: {
      leftOnly: opts.leftOnly ?? 100,
      rightOnly: opts.rightOnly ?? 50,
      both: opts.both ?? 25,
      leftLabel: opts.leftLabel ?? 'Concept Set A',
      rightLabel: opts.rightLabel ?? 'Concept Set B',
    },
    global: {
      plugins: [vuetify, createPinia()],
    },
  })
}

describe('ComparisonVennDiagram', () => {
  it('renders the three count labels with the supplied values', () => {
    const wrapper = createWrapper({ leftOnly: 120, rightOnly: 80, both: 30 })

    expect(wrapper.find('[data-testid="venn-left-count"]').text()).toBe('120')
    expect(wrapper.find('[data-testid="venn-both-count"]').text()).toBe('30')
    expect(wrapper.find('[data-testid="venn-right-count"]').text()).toBe('80')
  })

  it('renders both name labels', () => {
    const wrapper = createWrapper({
      leftLabel: 'Diabetes',
      rightLabel: 'Hypertension',
    })

    const html = wrapper.html()
    expect(html).toContain('Diabetes')
    expect(html).toContain('Hypertension')
  })

  it('shows total caption equal to leftOnly + rightOnly + both', () => {
    const wrapper = createWrapper({ leftOnly: 10, rightOnly: 20, both: 5 })

    const total = wrapper.find('[data-testid="venn-total"]')
    expect(total.exists()).toBe(true)
    expect(total.text()).toContain('35')
  })

  it('truncates long labels with ellipsis and exposes full label via <title>', () => {
    const longLabel = 'A really long concept set label that should be truncated'
    const wrapper = createWrapper({ leftLabel: longLabel, rightLabel: 'Short' })

    const truncatedDisplay = longLabel.slice(0, 23) + '…'

    const leftNameText = wrapper.find('.venn-name-left')
    expect(leftNameText.exists()).toBe(true)
    const visibleText = (leftNameText.element.firstChild?.textContent ?? '').trim()
    expect(visibleText).toBe(truncatedDisplay)
    expect(visibleText).not.toBe(longLabel)

    const titles = wrapper.findAll('title')
    const titleTexts = titles.map((t) => t.text())
    expect(titleTexts).toContain(longLabel)
  })

  it('renders three "0" labels when all counts are zero', () => {
    const wrapper = createWrapper({ leftOnly: 0, rightOnly: 0, both: 0 })

    expect(wrapper.find('[data-testid="venn-left-count"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="venn-both-count"]').text()).toBe('0')
    expect(wrapper.find('[data-testid="venn-right-count"]').text()).toBe('0')
  })
})
