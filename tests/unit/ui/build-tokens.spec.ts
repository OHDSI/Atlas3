// tests/unit/ui/build-tokens.spec.ts
import { describe, it, expect } from 'vitest'
import { generateTokensCss } from '@/ui/build-tokens'
import { tokens } from '@/ui/tokens'

describe('generateTokensCss', () => {
  const css = generateTokensCss(tokens)

  it('starts with a "GENERATED — DO NOT EDIT" header', () => {
    expect(css).toMatch(/^\/\* GENERATED — DO NOT EDIT/m)
  })

  it('emits a :root, .v-theme--light block for light colors + shared tokens', () => {
    expect(css).toMatch(/:root,\s*\.v-theme--light\s*\{/)
    expect(css).toContain('--atlas-color-primary: #1f425a;')
    expect(css).toContain('--atlas-radius-md: 8px;')
  })

  it('emits a .v-theme--dark block overriding only color tokens', () => {
    expect(css).toMatch(/\.v-theme--dark\s*\{/)
    const darkBlock = css.slice(css.indexOf('.v-theme--dark'))
    expect(darkBlock).toContain('--atlas-color-primary: #6aa3cb;')
    expect(darkBlock).toContain('--atlas-color-surface: #161618;')
    // shared (non-color) tokens are NOT repeated in the dark block
    expect(darkBlock).not.toContain('--atlas-radius-md')
  })

  it('emits color custom properties with --atlas- prefix', () => {
    expect(css).toContain('--atlas-color-primary: #1f425a;')
    expect(css).toContain('--atlas-color-accent: #eb6622;')
    expect(css).toContain('--atlas-color-on-surface-variant: rgba(0,0,0,.62);')
  })

  it('emits radius, spacing, motion, z properties (kebab-cased)', () => {
    expect(css).toContain('--atlas-radius-md: 8px;')
    expect(css).toContain('--atlas-spacing-lg: 24px;')
    expect(css).toContain('--atlas-motion-med: 160ms ease;')
    expect(css).toContain('--atlas-z-dialog: 2000;')
  })

  it('camelCase keys become kebab-case custom property names', () => {
    expect(css).toContain('--atlas-color-surface-variant:')
    expect(css).toContain('--atlas-color-primary-darken:')
  })
})
