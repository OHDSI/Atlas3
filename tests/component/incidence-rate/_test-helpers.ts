import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { vi } from 'vitest'

export const vuetify = createVuetify({ components, directives })

export function pristinePinia() {
  const p = createPinia()
  setActivePinia(p)
  return p
}

export function stubI18n() {
  return vi.mock('@/composables/useI18n', () => ({
    useI18n: () => ({
      t: (_key: string, fallback: string) => ({ value: fallback }),
      tv: (_key: string, fallback: string) => fallback,
    }),
  }))
}
