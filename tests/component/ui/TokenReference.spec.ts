import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TokenReference from '@/components/ui/_docs/TokenReference.vue'
import { tokens } from '@/ui/tokens'

describe('TokenReference', () => {
  const wrapper = mount(TokenReference)

  it('renders one row per color token', () => {
    const rows = wrapper.findAll('.tok__row')
    expect(rows.length).toBe(Object.keys(tokens.color).length)
  })

  it('renders a light and a dark swatch for every color token', () => {
    const swatches = wrapper.findAll('.tok__sw')
    expect(swatches.length).toBe(Object.keys(tokens.color).length * 2)
  })

  it('binds a light and a dark background to each row\'s two swatches', () => {
    const firstRowSwatches = wrapper.findAll('.tok__row')[0].findAll('.tok__sw')
    const lightStyle = firstRowSwatches[0].attributes('style') ?? ''
    const darkStyle = firstRowSwatches[1].attributes('style') ?? ''
    // jsdom normalises colors (e.g. hex -> rgb), so assert structurally:
    // both swatches set a background, and the light/dark values differ.
    expect(lightStyle).toContain('background')
    expect(darkStyle).toContain('background')
    expect(lightStyle).not.toBe(darkStyle)
  })

  it('shows kebab-cased --atlas-color-* custom property names', () => {
    expect(wrapper.text()).toContain('--atlas-color-primary')
    expect(wrapper.text()).toContain('--atlas-color-surface-variant')
  })

  it('lists the radius and spacing scales with their values', () => {
    expect(wrapper.text()).toContain('--atlas-radius-md')
    expect(wrapper.text()).toContain(tokens.radius.md)
    expect(wrapper.text()).toContain('--atlas-spacing-md')
    expect(wrapper.text()).toContain(tokens.spacing.md)
  })
})
