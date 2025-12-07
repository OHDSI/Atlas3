/**
 * Test Helper: Vuetify Setup
 * Shared Vuetify configuration for component tests
 */

import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

/**
 * Create a Vuetify instance configured for testing
 * Includes all components and directives for full coverage
 */
export function createTestVuetify() {
  return createVuetify({
    components,
    directives,
  })
}

/**
 * Singleton instance for tests that don't need isolation
 */
export const vuetify = createTestVuetify()
