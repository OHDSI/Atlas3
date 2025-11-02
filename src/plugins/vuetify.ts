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

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1f425a',    // Atlas primary color
          secondary: '#424242',  // Material Grey Darken-3
          accent: '#2d5f7f',     // Lighter shade of primary
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FB8C00',
          background: '#FFFFFF',
          surface: '#FFFFFF',
        },
      },
    },
  },
  defaults: {
    VBtn: {
      variant: 'flat',
      color: 'primary',
    },
    VCard: {
      variant: 'elevated',
      elevation: 2,
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
    },
    VAutocomplete: {
      variant: 'outlined',
      density: 'comfortable',
    },
  },
})
