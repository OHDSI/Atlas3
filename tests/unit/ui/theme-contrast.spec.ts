import { describe, it, expect } from 'vitest'
import { composite, contrastRatio, parseColor } from '@/ui/contrast'
import { tokens } from '@/ui/tokens'

const AA_TEXT = 4.5
const AA_UI = 3

const dark = tokens.colorDark
const surfaces: Array<[string, string]> = [
  ['surface', dark.surface],
  ['surfaceVariant', dark.surfaceVariant],
]

const textTokens: Array<[string, string]> = [
  ['onSurface', dark.onSurface],
  ['onSurfaceVariant', dark.onSurfaceVariant],
  ['primaryText', dark.primaryText],
  ['accentText', dark.accentText],
  ['infoText', dark.infoText],
  ['successText', dark.successText],
  ['warningText', dark.warningText],
  ['dangerText', dark.dangerText],
]

const fillTokens: Array<[string, string, string]> = [
  ['primary', dark.primary, dark.onPrimary],
  ['accent', dark.accent, dark.onAccent],
  ['info', dark.info, dark.onInfo],
  ['success', dark.success, dark.onSuccess],
  ['warning', dark.warning, dark.onWarning],
  ['danger', dark.danger, dark.onDanger],
]

describe('dark theme contrast (WCAG 2.2 AA)', () => {
  it.each(
    textTokens.flatMap(([name, color]) =>
      surfaces.map(([sName, sColor]) => [name, color, sName, sColor] as const),
    ),
  )('%s on %s meets 4.5:1', (_n, color, _s, surface) => {
    expect(contrastRatio(color, surface)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(fillTokens)('fill %s meets 3:1 against the surface', (_name, fill) => {
    expect(contrastRatio(fill, dark.surface)).toBeGreaterThanOrEqual(AA_UI)
  })

  it.each(fillTokens)('on-%s text meets 4.5:1 against its fill', (_name, fill, onFill) => {
    expect(contrastRatio(onFill, fill)).toBeGreaterThanOrEqual(AA_TEXT)
  })

  it.each(surfaces)('outlineStrong meets 3:1 against %s', (_name, surface) => {
    expect(contrastRatio(dark.outlineStrong, surface)).toBeGreaterThanOrEqual(AA_UI)
  })

  // VChip and VAlert default to variant="tonal", which paints the fill at ~12%
  // over the surface and draws the label in the full fill colour.
  it.each(fillTokens)('tonal %s labels meet 4.5:1 on their own tonal background', (_name, fill) => {
    const [r, g, b] = parseColor(fill)
    const tonalRgb = composite(`rgba(${r},${g},${b},0.12)`, dark.surface)
    const tonalBg = `rgb(${tonalRgb[0]}, ${tonalRgb[1]}, ${tonalRgb[2]})`
    expect(contrastRatio(fill, tonalBg)).toBeGreaterThanOrEqual(AA_TEXT)
  })
})

// The light theme is deliberately frozen: several of these ratios are below AA
// today and fixing them is out of scope. Locking the measured values means any
// accidental light-palette change fails here instead of shipping silently.
describe('light theme contrast (frozen, not AA-enforced)', () => {
  const light = tokens.color
  const FROZEN: Array<[string, string, number]> = [
    ['onSurface', light.onSurface, 16.07],
    ['onSurfaceVariant', light.onSurfaceVariant, 6.2],
    ['primaryText', light.primaryText, 10.58],
    ['accentText', light.accentText, 3.25],
    ['infoText', light.infoText, 3.12],
    ['successText', light.successText, 2.78],
    ['warningText', light.warningText, 2.37],
    ['dangerText', light.dangerText, 3.19],
  ]

  it.each(FROZEN)('%s still measures its recorded ratio on the light surface', (_n, color, expected) => {
    expect(contrastRatio(color, light.surface)).toBeCloseTo(expected, 1)
  })
})
