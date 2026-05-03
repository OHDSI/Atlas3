// src/ui/theme.ts
import type { VuetifyOptions } from 'vuetify'
import { tokens } from './tokens'

type ThemeOptions = Pick<VuetifyOptions, 'theme' | 'defaults'>

export function buildVuetifyOptions(primaryOverride?: string | null): ThemeOptions {
  return {
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: primaryOverride || tokens.color.primary,
            'primary-darken-1': tokens.color.primaryDarken,
            secondary: '#424242',
            accent: '#2d5f7f',
            error: tokens.color.danger,
            info: tokens.color.info,
            success: tokens.color.success,
            warning: tokens.color.warning,
            orange: tokens.color.accent,
            background: tokens.color.surfaceVariant,
            surface: tokens.color.surface,
            'surface-variant': tokens.color.surfaceVariant,
            'on-surface': tokens.color.onSurface,
            'on-surface-variant': tokens.color.onSurfaceVariant,
            outline: tokens.color.outline,
            'outline-variant': tokens.color.outlineVariant,
          },
        },
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
