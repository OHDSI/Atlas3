import { describe, it, expect } from 'vitest'
import * as vuetifyColors from 'vuetify/util/colors'
import { getDomainColor } from '@/utils/domain-colors'
import { composite, contrastRatio, parseColor } from '@/ui/contrast'

const AA_TEXT = 4.5
const DARK_SURFACE = '#161618'

// Kebab-case family names, as used throughout domain-colors.ts, mapped to
// the camelCase keys vuetify's own colour module exports them under.
const FAMILY_KEYS = [
  'red',
  'pink',
  'purple',
  'deep-purple',
  'indigo',
  'blue',
  'light-blue',
  'cyan',
  'teal',
  'green',
  'light-green',
  'lime',
  'yellow',
  'amber',
  'orange',
  'deep-orange',
  'brown',
  'blue-grey',
  'grey',
].sort((a, b) => b.length - a.length)

// 'blue-grey-lighten-2' -> hex from vuetify's palette module. Vuetify's own
// `text-{name}` utility classes are generated from this same table, so this
// is the authoritative source rather than a hand-copied hex.
function resolveVuetifyColor(name: string): string {
  const family = FAMILY_KEYS.find((f) => name === f || name.startsWith(`${f}-`))
  if (!family) throw new Error(`Unknown Vuetify color family for "${name}"`)
  const shadePart = name.slice(family.length).replace(/^-/, '')
  const shade = shadePart === '' ? 'base' : shadePart.replace('-', '')
  const key = family.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase())
  const palette = (vuetifyColors as Record<string, Record<string, string>>)[key]
  if (!palette) throw new Error(`Unknown Vuetify color family "${key}" (from "${name}")`)
  const hex = palette[shade]
  if (!hex) throw new Error(`Unknown Vuetify shade "${shade}" for family "${key}" (from "${name}")`)
  return hex
}

// VChip defaults to variant="tonal": the label renders in the full colour,
// the background is that same colour composited at 12% over the surface.
function tonalLabelContrast(colorName: string): number {
  const hex = resolveVuetifyColor(colorName)
  const [r, g, b] = parseColor(hex)
  const tonalBg = composite(`rgba(${r}, ${g}, ${b}, 0.12)`, DARK_SURFACE)
  const tonalBgHex = `rgb(${tonalBg[0]}, ${tonalBg[1]}, ${tonalBg[2]})`
  return contrastRatio(hex, tonalBgHex)
}

describe('getDomainColor', () => {
  it('keeps the light mapping when no mode is given', () => {
    expect(getDomainColor('Condition')).toBe('red')
    expect(getDomainColor('Observation')).toBe('amber')
    expect(getDomainColor('Metadata')).toBe('grey-darken-1')
  })

  it('keeps the light mapping when mode is light', () => {
    expect(getDomainColor('Observation', 'light')).toBe('amber')
  })

  it('falls back to primary for an unknown domain in both modes', () => {
    expect(getDomainColor('Nonsense')).toBe('primary')
    expect(getDomainColor('Nonsense', 'dark')).toBe('primary')
    expect(getDomainColor(null)).toBe('primary')
  })

  const ALL_DOMAINS = [
    'Condition',
    'Drug',
    'Procedure',
    'Measurement',
    'Observation',
    'Device',
    'Visit',
    'Specimen',
    'Note',
    'Provider',
    'Geography',
    'Race',
    'Gender',
    'Ethnicity',
    'Type',
    'Unit',
    'Currency',
    'Metadata',
  ]

  it.each(ALL_DOMAINS)(
    'every domain has a dark-mode colour and stays a tonal chip name',
    (domain) => {
      const dark = getDomainColor(domain, 'dark')
      expect(dark).not.toBe('primary')
      expect(() => resolveVuetifyColor(dark)).not.toThrow()
    },
  )

  it.each(ALL_DOMAINS)('%s: dark-mode tonal chip label meets 4.5:1 on its own tonal background', (domain) => {
    const dark = getDomainColor(domain, 'dark')
    const ratio = tonalLabelContrast(dark)
    expect(ratio).toBeGreaterThanOrEqual(AA_TEXT)
  })

  // Regression: Note and Metadata both mapped to grey-lighten-1 in dark, so a
  // concept set holding both drew two identical chips and two identical
  // timeline series.
  it.each([
    ['light', 'light' as const],
    ['dark', 'dark' as const],
  ])('%s mode gives every domain its own colour', (_label, mode) => {
    const assigned = ALL_DOMAINS.map((domain) => getDomainColor(domain, mode))
    expect(new Set(assigned).size).toBe(ALL_DOMAINS.length)
  })

  it('picks a lighter step of the same hue for dark mode without switching hue families', () => {
    const sameFamily = (light: string, dark: string) => dark.split('-')[0] === light.split('-')[0]
    expect(sameFamily(getDomainColor('Condition'), getDomainColor('Condition', 'dark'))).toBe(true)
    expect(sameFamily(getDomainColor('Drug'), getDomainColor('Drug', 'dark'))).toBe(true)
    expect(sameFamily(getDomainColor('Gender'), getDomainColor('Gender', 'dark'))).toBe(true)
  })
})
