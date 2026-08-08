// tests/unit/ui/theme.spec.ts
import { describe, it, expect } from 'vitest'
import { buildVuetifyOptions } from '@/ui/theme'
import { tokens } from '@/ui/tokens'
import { contrastRatio } from '@/ui/contrast'

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

  it('defines a dark theme bound to the dark token set', () => {
    const opts = buildVuetifyOptions()
    const dark = opts.theme!.themes!.dark!.colors!
    expect(dark.primary).toBe(tokens.colorDark.primary)
    expect(dark.surface).toBe(tokens.colorDark.surface)
    expect(dark['on-surface']).toBe(tokens.colorDark.onSurface)
    expect(dark.error).toBe(tokens.colorDark.danger)
    expect(dark.orange).toBe(tokens.colorDark.accent)
    expect(dark.outline).toBe(tokens.colorDark.outlineStrong)
  })

  it('marks the dark theme as dark for Vuetify', () => {
    const opts = buildVuetifyOptions()
    expect(opts.theme!.themes!.dark!.dark).toBe(true)
  })

  it('applies a primary override to light and lifts it for dark contrast', () => {
    const opts = buildVuetifyOptions('#000000')
    expect(opts.theme!.themes!.light!.colors!.primary).toBe('#000000')
    expect(opts.theme!.themes!.dark!.colors!.primary).toBe('#7f7f7f')
    expect(
      contrastRatio(opts.theme!.themes!.dark!.colors!.primary as string, tokens.colorDark.surface),
    ).toBeGreaterThanOrEqual(4.5)
  })
})

describe('dark theme colours', () => {
  it('binds the dark on-fill foregrounds explicitly', () => {
    const dark = buildVuetifyOptions().theme!.themes!.dark!.colors!
    expect(dark['on-primary']).toBe(tokens.colorDark.onPrimary)
    expect(dark['on-error']).toBe(tokens.colorDark.onDanger)
    expect(dark['on-info']).toBe(tokens.colorDark.onInfo)
    expect(dark['on-success']).toBe(tokens.colorDark.onSuccess)
    expect(dark['on-warning']).toBe(tokens.colorDark.onWarning)
  })

  it('leaves the light theme without explicit on-fill overrides', () => {
    const light = buildVuetifyOptions().theme!.themes!.light!.colors!
    expect(light['on-primary']).toBeUndefined()
    expect(light['on-warning']).toBeUndefined()
  })

  it('lightens an admin primary that is too dark for the dark surface', () => {
    const opts = buildVuetifyOptions('#1f425a')
    const dark = opts.theme!.themes!.dark!.colors!
    expect(dark.primary).toBe('#6d8494')
    expect(contrastRatio(dark.primary as string, tokens.colorDark.surface)).toBeGreaterThanOrEqual(4.5)
  })

  it('passes the admin primary through to the light theme unchanged', () => {
    const opts = buildVuetifyOptions('#1f425a')
    expect(opts.theme!.themes!.light!.colors!.primary).toBe('#1f425a')
  })

  it('leaves an admin primary that already clears AA untouched in dark', () => {
    const opts = buildVuetifyOptions('#6aa3cb')
    expect(opts.theme!.themes!.dark!.colors!.primary).toBe('#6aa3cb')
  })

  it('uses the strong outline for dark borders', () => {
    const dark = buildVuetifyOptions().theme!.themes!.dark!.colors!
    expect(dark.outline).toBe(tokens.colorDark.outlineStrong)
  })

  it('keeps the light outline decorative', () => {
    const light = buildVuetifyOptions().theme!.themes!.light!.colors!
    expect(light.outline).toBe(tokens.color.outline)
  })
})
