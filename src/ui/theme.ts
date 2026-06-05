// src/ui/theme.ts
import type { VuetifyOptions } from 'vuetify'
import { tokens } from './tokens'

type ThemeOptions = Pick<VuetifyOptions, 'theme' | 'defaults'>

type ColorSet = typeof tokens.color

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

export function buildVuetifyOptions(primaryOverride?: string | null): ThemeOptions {
  return {
    theme: {
      defaultTheme: 'light',
      themes: {
        light: { colors: colorsFor(tokens.color, primaryOverride) },
        dark: { dark: true, colors: colorsFor(tokens.colorDark, primaryOverride) },
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
