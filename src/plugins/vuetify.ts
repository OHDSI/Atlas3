/**
 * Vuetify 3 Plugin Configuration
 *
 * Material Design theme for Atlas Cohort Builder.
 * Colors configured to approximate reference UI while maintaining Material Design standards.
 */
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

// Default theme colors
const DEFAULT_PRIMARY_COLOR = '#1f425a'; // Atlas primary color

/**
 * Create Vuetify instance with optional theme color overrides
 * @param primaryColor Optional primary color override (hex color code)
 */
export function createVuetifyInstance(primaryColor?: string | null) {
  return createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          colors: {
            primary: primaryColor || DEFAULT_PRIMARY_COLOR,
            'primary-darken-1': '#163349',
            secondary: '#424242',
            accent: '#2d5f7f',
            error: '#FF5252',
            info: '#2196F3',
            success: '#4CAF50',
            warning: '#FB8C00',
            orange: '#eb6622',
            background: '#f6f7f9',
            surface: '#FFFFFF',
            'surface-variant': '#f6f7f9',
            'on-surface': '#000000',
            'on-surface-variant': '#616161',
            outline: '#e0e0e0',
            'outline-variant': '#eeeeee',
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
      VCard: {
        variant: 'flat',
        rounded: 'lg',
      },
      VTextField: {
        variant: 'outlined',
        density: 'comfortable',
        rounded: 'md',
      },
      VSelect: {
        variant: 'outlined',
        density: 'comfortable',
        rounded: 'md',
      },
      VAutocomplete: {
        variant: 'outlined',
        density: 'comfortable',
        rounded: 'md',
      },
      VDialog: {
        rounded: 'lg',
      },
      VChip: {
        variant: 'tonal',
        rounded: 'md',
        density: 'comfortable',
      },
      VAlert: {
        variant: 'tonal',
        rounded: 'md',
      },
    },
  })
}

// Export default instance for backward compatibility
export default createVuetifyInstance()
