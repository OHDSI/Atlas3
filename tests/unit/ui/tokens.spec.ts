import { describe, it, expect } from 'vitest'
import { tokens } from '@/ui/tokens'

describe('design tokens', () => {
  it('exposes the brand colors used across the app', () => {
    expect(tokens.color.primary).toBe('#1f425a')
    expect(tokens.color.primaryDarken).toBe('#163349')
    expect(tokens.color.accent).toBe('#eb6622')
  })

  it('exposes surface and on-surface colors', () => {
    expect(tokens.color.surface).toBe('#ffffff')
    expect(tokens.color.surfaceVariant).toBe('#f6f7f9')
    expect(tokens.color.onSurface).toBe('rgba(0,0,0,.87)')
    expect(tokens.color.onSurfaceVariant).toBe('rgba(0,0,0,.62)')
  })

  it('exposes outline colors', () => {
    expect(tokens.color.outline).toBe('rgba(0,0,0,.12)')
    expect(tokens.color.outlineVariant).toBe('rgba(0,0,0,.06)')
  })

  it('exposes semantic feedback colors', () => {
    expect(tokens.color.info).toBe('#2196f3')
    expect(tokens.color.success).toBe('#4caf50')
    expect(tokens.color.warning).toBe('#fb8c00')
    expect(tokens.color.danger).toBe('#ff5252')
  })

  it('exposes radius, spacing, density, elevation, motion, z scales', () => {
    expect(tokens.radius.md).toBe('8px')
    expect(tokens.spacing.md).toBe('16px')
    expect(tokens.density.default).toBe('compact')
    expect(tokens.elevation.ambient).toMatch(/^0 1px 3px/)
    expect(tokens.motion.med).toBe('160ms ease')
    expect(tokens.z.dialog).toBe(2000)
  })
})
