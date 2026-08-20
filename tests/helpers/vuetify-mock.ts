/**
 * Test Helper: Vuetify Mock
 * Provides Vuetify instance configuration for component tests
 */

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * Create a Vuetify instance for testing
 * Includes all components and directives for full component support
 */
export function createTestVuetify() {
  return createVuetify({
    components,
    directives,
    theme: {
      defaultTheme: 'light',
    },
  })
}

/**
 * Default Vuetify instance for simple tests
 */
export const vuetify = createTestVuetify()
