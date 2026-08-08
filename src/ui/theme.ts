// src/ui/theme.ts
import type { VuetifyOptions } from 'vuetify'
import { tokens } from './tokens'
import { lightenUntil } from './contrast'

type ThemeOptions = Pick<VuetifyOptions, 'theme' | 'defaults'>

// Widen the literal `as const` token types to plain strings so both the light
// (tokens.color) and dark (tokens.colorDark) sets are assignable to colorsFor.
type ColorSet = Record<keyof typeof tokens.color, string>

const AA_TEXT = 4.5

function colorsFor(set: ColorSet, primaryOverride?: string | null) {
  return {
    primary: primaryOverride || set.primary,
    'primary-darken-1': set.primaryDarken,
    secondary: '#424242',
    accent: '#2d5f7f',
    error: set.danger,
    info: set.info,
    success: set.success,
    warning: set.warning,
    orange: set.accent,
    background: set.surfaceVariant,
    surface: set.surface,
    'surface-variant': set.surfaceVariant,
    'on-surface': set.onSurface,
    'on-surface-variant': set.onSurfaceVariant,
    outline: set.outline,
    'outline-variant': set.outlineVariant,
  }
}

function darkColors(primaryOverride?: string | null) {
  const set = tokens.colorDark as ColorSet
  // An admin's brand primary is tuned for the white light-mode surface; used raw
  // it can vanish against the dark surface, so lift it until it clears AA.
  const primary = primaryOverride
    ? lightenUntil(primaryOverride, set.surface, AA_TEXT)
    : set.primary
  return {
    ...colorsFor(set),
    primary,
    outline: set.outlineStrong,
    'on-primary': set.onPrimary,
    'on-error': set.onDanger,
    'on-info': set.onInfo,
    'on-success': set.onSuccess,
    'on-warning': set.onWarning,
    'on-background': set.onSurface,
  }
}

export function buildVuetifyOptions(primaryOverride?: string | null): ThemeOptions {
  return {
    theme: {
      defaultTheme: 'light',
      themes: {
        light: { colors: colorsFor(tokens.color, primaryOverride) },
        dark: { dark: true, colors: darkColors(primaryOverride) },
      },
    },
    defaults: {
      VBtn: {
        variant: 'flat',
        color: 'primary',
        rounded: 'lg',
        style: 'text-transform: none; letter-spacing: 0;',
      },
      VCard: { variant: 'flat', rounded: 'lg' },
      VTextField: { variant: 'outlined', density: tokens.density.default, rounded: 'md' },
      VSelect: { variant: 'outlined', density: tokens.density.default, rounded: 'md' },
      VAutocomplete: { variant: 'outlined', density: tokens.density.default, rounded: 'md' },
      VDialog: { rounded: 'lg' },
      VChip: { variant: 'tonal', rounded: 'md', density: tokens.density.default },
      VAlert: { variant: 'tonal', rounded: 'md' },
    },
  }
}
