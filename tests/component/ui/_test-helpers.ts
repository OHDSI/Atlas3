import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

export const vuetify = createVuetify({ components, directives })

export function pristinePinia() {
  const p = createPinia()
  setActivePinia(p)
  return p
}
