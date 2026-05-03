// tests/unit/ui/theme.spec.ts
import { describe, it, expect } from 'vitest'
import { buildVuetifyOptions } from '@/ui/theme'
import { tokens } from '@/ui/tokens'

describe('buildVuetifyOptions', () => {
  it('binds Vuetify color slots to tokens', () => {
    const opts = buildVuetifyOptions()
    const light = opts.theme!.themes!.light!.colors!
    expect(light.primary).toBe(tokens.color.primary)
    expect(light.secondary).toBe('#424242')
    expect(light.error).toBe(tokens.color.danger)
    expect(light.info).toBe(tokens.color.info)
    expect(light.success).toBe(tokens.color.success)
    expect(light.warning).toBe(tokens.color.warning)
    expect(light.surface).toBe(tokens.color.surface)
    expect(light['surface-variant']).toBe(tokens.color.surfaceVariant)
    expect(light['on-surface']).toBe(tokens.color.onSurface)
    expect(light['on-surface-variant']).toBe(tokens.color.onSurfaceVariant)
    expect(light.outline).toBe(tokens.color.outline)
    expect(light['outline-variant']).toBe(tokens.color.outlineVariant)
    expect(light.orange).toBe(tokens.color.accent)
  })

  it('overrides primary when an explicit color is passed', () => {
    const opts = buildVuetifyOptions('#000000')
    expect(opts.theme!.themes!.light!.colors!.primary).toBe('#000000')
  })

  it('locks density to compact for input components', () => {
    const opts = buildVuetifyOptions()
    expect(opts.defaults!.VTextField!.density).toBe('compact')
    expect(opts.defaults!.VSelect!.density).toBe('compact')
    expect(opts.defaults!.VAutocomplete!.density).toBe('compact')
    expect(opts.defaults!.VChip!.density).toBe('compact')
  })

  it('keeps the existing button defaults (flat / primary / rounded-lg / no uppercase)', () => {
    const opts = buildVuetifyOptions()
    const btn = opts.defaults!.VBtn!
    expect(btn.variant).toBe('flat')
    expect(btn.color).toBe('primary')
    expect(btn.rounded).toBe('lg')
    expect(String(btn.style)).toMatch(/text-transform:\s*none/)
  })

  it('sets defaultTheme to light', () => {
    const opts = buildVuetifyOptions()
    expect(opts.theme!.defaultTheme).toBe('light')
  })
})
